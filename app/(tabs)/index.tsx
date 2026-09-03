import AntDesign from "@expo/vector-icons/AntDesign";
import { Link, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiFetch } from "../../src/api";
import { useSession } from "../../src/session";
import { colors, shadow, type } from "../../src/theme";
import { initials, money } from "../../src/types";

type Balance = {
  summary: { you_are_owed: number; you_owe: number; net_balance: number };
  currency: string;
  data: unknown[];
};
type Friend = { user_id: string; name: string };
const fmt = (n: number, c = "NPR") => money(n, c);

function netSentence(net: number, c: string) {
  if (net > 0) return `You are owed ${fmt(net, c)} in total`;
  if (net < 0) return `You owe ${fmt(Math.abs(net), c)} in total`;
  return "All settled — no one owes anything";
}

export default function Home() {
  const { user } = useSession();
  const [balance, setBalance] = useState<Balance>();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => {
    setError("");
    try {
      const [b, f] = await Promise.all([
        apiFetch<Balance>("/api/v1/me/balances"),
        apiFetch<{ data: Friend[] }>("/api/v1/friends"),
      ]);
      setBalance(b);
      setFriends(f.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load overview.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load();
  }, [load]);

  if (loading)
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.loadingWrap}>
          <ActivityIndicator color={colors.teal} />
          <Text style={s.muted}>Loading overview…</Text>
        </View>
      </SafeAreaView>
    );
  const c = balance?.currency || "NPR";
  const net = balance?.summary.net_balance || 0;
  const owed = balance?.summary.you_are_owed || 0;
  const owe = balance?.summary.you_owe || 0;

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.teal}
          />
        }
        contentContainerStyle={s.page}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.header}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.eyebrow}>SETTLR WORKSPACE</Text>
            <Text style={s.title}>Overview</Text>
            <Text style={s.subtle} numberOfLines={1}>
              Track who owes whom, clearly.
            </Text>
          </View>
          <View
            style={s.avatar}
            accessibilityLabel={`Signed in as ${user?.name || "You"}`}
          >
            <Text style={s.avatarText}>{initials(user?.name || "You")}</Text>
          </View>
        </View>
        {error ? (
          <View style={s.errorBox}>
            <Text style={s.errorText}>{error}</Text>
            <Pressable onPress={() => void load()} hitSlop={8}>
              <Text style={s.errorLink}>Try again</Text>
            </Pressable>
          </View>
        ) : null}
        <View style={s.hero} accessible accessibilityRole="header">
          <View style={s.heroTop}>
            <Text style={s.heroLabel}>NET BALANCE</Text>
            <View style={s.heroIcon}>
              <AntDesign name="wallet" size={16} color={colors.teal} />
            </View>
          </View>
          <Text
            style={[
              s.heroAmount,
              net < 0 && s.amountNegative,
              net > 0 && s.amountPositive,
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {fmt(Math.abs(net), c)}
          </Text>
          <Text style={s.heroSentence}>{netSentence(net, c)}</Text>
          <Text style={s.heroMeta}>
            Across {balance?.data.length || 0} active group
            {(balance?.data.length || 0) === 1 ? "" : "s"} · {fmt(owed, c)} owed
            to you · {fmt(owe, c)} you owe
          </Text>
          <View style={s.split}>
            <View style={s.splitItem}>
              <Text style={s.miniLabel}>YOU ARE OWED</Text>
              <Text style={s.positive} numberOfLines={1} adjustsFontSizeToFit>
                {fmt(owed, c)}
              </Text>
              <Text style={s.splitHelp}>Others owe you</Text>
            </View>
            <View style={s.splitDivider} />
            <View style={s.splitItem}>
              <Text style={s.miniLabel}>YOU OWE</Text>
              <Text
                style={[s.negative, s.negativeLarge]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {fmt(owe, c)}
              </Text>
              <Text style={s.splitHelp}>You owe others</Text>
            </View>
          </View>
        </View>

        <View style={s.actions}>
          <Quick
            href="/add"
            icon="plus"
            label="Add expense"
            hint="Split with group"
            primary
          />
          <Quick
            href="/(tabs)/groups"
            icon="team"
            label="View groups"
            hint={`${balance?.data.length || 0} ledgers`}
          />
          <Quick
            href="/(tabs)/groups?new=1"
            icon="plus-circle"
            label="New group"
            hint="Home · Trip"
          />
        </View>

        <View style={s.sectionHead}>
          <Text style={s.section}>Friends</Text>
          <Text style={s.sectionMeta}>{friends.length} connected</Text>
        </View>
        {friends.slice(0, 4).map((f) => (
          <View style={s.card} key={f.user_id} accessible>
            <View style={s.friend}>
              <Text style={s.friendText}>{initials(f.name)}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.cardTitle} numberOfLines={1}>
                {f.name}
              </Text>
              <Text style={s.cardSubtitle} numberOfLines={1}>
                Connected on Settlr
              </Text>
            </View>
            <View style={s.checkBadge}>
              <AntDesign name="check" color={colors.teal} size={12} />
            </View>
          </View>
        ))}
        {!friends.length ? (
          <View style={s.empty}>
            <View style={s.emptyIcon}>
              <AntDesign name="team" size={20} color={colors.teal} />
            </View>
            <Text style={s.emptyTitle}>No friends yet</Text>
            <Text style={s.emptyText}>Accepted friends will appear here.</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
function Quick({
  href,
  icon,
  label,
  hint,
  primary,
}: {
  href: "/add" | "/(tabs)/groups" | "/(tabs)/groups?new=1";
  icon: string;
  label: string;
  hint?: string;
  primary?: boolean;
}) {
  return (
    <Link href={href} asChild>
      <Pressable
        testID={`quick-${label.toLowerCase().replace(/\s+/g, "-")}`}
        style={({ pressed }) => [
          s.quick,
          primary && s.quickPrimary,
          pressed && s.quickPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <View style={[s.quickIcon, primary && s.quickIconPrimary]}>
          <AntDesign
            name={icon as never}
            color={primary ? colors.teal : colors.teal}
            size={18}
          />
        </View>
        <Text style={[s.quickText, primary && s.quickTextPrimary]}>
          {label}
        </Text>
        {hint ? (
          <Text style={[s.quickHint, primary && s.quickHintPrimary]}>
            {hint}
          </Text>
        ) : null}
      </Pressable>
    </Link>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
  },
  page: { padding: 16, paddingBottom: 110, gap: 14 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 4,
  },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 1.6,
    color: colors.teal,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  title: {
    fontFamily: type.title,
    fontSize: 28,
    color: colors.ink,
    marginTop: 4,
    lineHeight: 32,
  },
  subtle: { fontSize: 12, color: colors.muted, marginTop: 4, lineHeight: 16 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.teal,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: { color: colors.white, fontSize: 13, fontWeight: "800" },
  errorBox: {
    backgroundColor: colors.coralSoft,
    borderColor: colors.dangerBorder,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  errorText: { color: colors.coral, fontSize: 12, flex: 1, lineHeight: 16 },
  errorLink: { color: colors.teal, fontSize: 12, fontWeight: "800" },
  hero: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 22,
    padding: 18,
    gap: 6,
    ...shadow,
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.sage,
    alignItems: "center",
    justifyContent: "center",
  },
  heroLabel: {
    fontSize: 10,
    letterSpacing: 1.4,
    color: colors.muted,
    fontWeight: "800",
  },
  heroAmount: {
    fontFamily: type.title,
    color: colors.ink,
    fontSize: 32,
    lineHeight: 36,
    marginTop: 10,
  },
  amountPositive: { color: colors.teal },
  amountNegative: { color: colors.coral },
  heroSentence: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink,
    marginTop: 2,
    lineHeight: 18,
  },
  heroMeta: { fontSize: 11, color: colors.muted, lineHeight: 16, marginTop: 2 },
  muted: { fontSize: 11, color: colors.muted, lineHeight: 15 },
  split: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    marginTop: 12,
    paddingTop: 14,
    flexDirection: "row",
    alignItems: "stretch",
  },
  splitItem: { flex: 1, gap: 4 },
  splitDivider: {
    width: 1,
    backgroundColor: colors.line,
    marginHorizontal: 12,
  },
  miniLabel: {
    fontSize: 9,
    letterSpacing: 1.2,
    color: colors.muted,
    fontWeight: "800",
  },
  positive: {
    color: colors.teal,
    fontWeight: "800",
    fontSize: 15,
    marginTop: 2,
  },
  negative: {
    color: colors.coral,
    fontWeight: "800",
    fontSize: 15,
    marginTop: 2,
  },
  negativeLarge: { fontSize: 15 },
  splitHelp: { fontSize: 10, color: colors.muted, marginTop: 1 },
  actions: { flexDirection: "row", gap: 10 },
  quick: {
    flex: 1,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: "center",
    gap: 6,
    minHeight: 86,
    justifyContent: "center",
  },
  quickPrimary: {
    backgroundColor: colors.teal,
    borderColor: colors.tealPressed,
    ...shadow,
    elevation: 3,
  },
  quickPressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
  quickIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.sage,
    alignItems: "center",
    justifyContent: "center",
  },
  quickIconPrimary: { backgroundColor: colors.white },
  quickText: {
    fontSize: 11,
    color: colors.ink,
    fontWeight: "800",
    textAlign: "center",
  },
  quickTextPrimary: { color: colors.white },
  quickHint: {
    fontSize: 10,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 12,
  },
  quickHintPrimary: { color: "rgba(255,255,255,0.92)" },
  sectionHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginTop: 4,
    marginBottom: 2,
  },
  section: { fontFamily: type.title, fontSize: 20, color: colors.ink },
  sectionMeta: { fontSize: 11, color: colors.muted, fontWeight: "600" },
  card: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    minHeight: 62,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.ink,
    textTransform: "capitalize",
  },
  cardSubtitle: { fontSize: 11, color: colors.muted, marginTop: 2 },
  friend: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.sage,
    alignItems: "center",
    justifyContent: "center",
  },
  friendText: { fontSize: 11, fontWeight: "800", color: colors.teal },
  checkBadge: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: colors.sage,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    backgroundColor: colors.paper,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: colors.line,
  },
  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.sage,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { fontFamily: type.title, fontSize: 16, color: colors.ink },
  emptyText: {
    fontSize: 12,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 16,
  },
});
