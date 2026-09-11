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
type Activity = {
  id: string;
  type: string;
  created_at: string;
  group_id?: string;
};
type Group = { id: string; name: string; currency: string; group_type: string };
const fmt = (n: number, c = "NPR") => money(n, c);

function netSentence(net: number, c: string) {
  if (net > 0) return `You are owed ${fmt(net, c)} in total`;
  if (net < 0) return `You owe ${fmt(Math.abs(net), c)} in total`;
  return "All settled — no one owes anything";
}

export default function Home() {
  const { user } = useSession();
  const [balance, setBalance] = useState<Balance>();
  const [groups, setGroups] = useState<Group[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => {
    setError("");
    try {
      const [b, g, a] = await Promise.all([
        apiFetch<Balance>("/api/v1/me/balances"),
        apiFetch<{ data: Group[] }>("/api/v1/groups").catch(() => ({
          data: [] as Group[],
        })),
        apiFetch<{ data: Activity[] }>("/api/v1/activity?limit=5").catch(
          () => ({ data: [] as Activity[] }),
        ),
      ]);
      setBalance(b);
      setGroups(g.data.slice(0, 4));
      setActivity(a.data);
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
            <View style={[s.heroIcon, { backgroundColor: colors.teal }]}>
              <AntDesign name="wallet" size={18} color={colors.white} />
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
          <Quick
            href="/(tabs)/groups"
            icon="swap"
            label="Settle up"
            hint="Pay back"
          />
        </View>

        <View style={s.sectionHead}>
          <Text style={s.section}>Recent activity</Text>
          <Link href="/(tabs)/activity" asChild>
            <Pressable hitSlop={8}>
              <Text style={s.sectionLink}>View all</Text>
            </Pressable>
          </Link>
        </View>
        {activity.length ? (
          activity.slice(0, 5).map((ev) => (
            <View key={ev.id} style={s.activityRow} accessible>
              <View style={s.activityIcon}>
                <AntDesign
                  name={
                    ev.type.includes("SETTLE") || ev.type.includes("PAY")
                      ? "swap"
                      : ev.type.includes("EXPENSE")
                        ? "wallet"
                        : "team"
                  }
                  size={14}
                  color={colors.teal}
                />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.cardTitle} numberOfLines={1}>
                  {ev.type.replaceAll("_", " ").toLowerCase()}
                </Text>
                <Text style={s.cardSubtitle} numberOfLines={1}>
                  {new Date(ev.created_at).toLocaleDateString()} ·{" "}
                  {ev.group_id ? "Group" : "System"}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <View style={s.card}>
            <Text style={s.cardSubtitle}>
              No recent activity — add an expense to get started.
            </Text>
          </View>
        )}

        <View style={s.sectionHead}>
          <Text style={s.section}>Active groups</Text>
          <Link href="/(tabs)/groups" asChild>
            <Pressable hitSlop={8}>
              <Text style={s.sectionLink}>View all</Text>
            </Pressable>
          </Link>
        </View>
        {groups.length ? (
          groups.map((g) => (
            <Link key={g.id} href={`/groups/${g.id}`} asChild>
              <Pressable style={s.card} accessibilityRole="button">
                <View style={s.friend}>
                  <AntDesign
                    name={g.group_type === "TRIP" ? "environment" : "team"}
                    size={16}
                    color={colors.teal}
                  />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.cardTitle} numberOfLines={1}>
                    {g.name}
                  </Text>
                  <Text style={s.cardSubtitle} numberOfLines={1}>
                    {g.group_type} · {g.currency}
                  </Text>
                </View>
                <AntDesign name="right" size={12} color={colors.muted} />
              </Pressable>
            </Link>
          ))
        ) : (
          <View style={s.card}>
            <Text style={s.cardSubtitle}>
              No groups yet — create one to start splitting.
            </Text>
          </View>
        )}
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
  href: "/add" | "/(tabs)/groups" | "/(tabs)/groups?new=1" | "/(tabs)/groups";
  icon: string;
  label: string;
  hint?: string;
  primary?: boolean;
}) {
  return (
    <Pressable
      testID={`quick-${label.toLowerCase().replace(/\s+/g, "-")}`}
      onPress={() => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { router } = require("expo-router");
        router.push(href);
      }}
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
      <Text style={[s.quickText, primary && s.quickTextPrimary]}>{label}</Text>
      {hint ? (
        <Text style={[s.quickHint, primary && s.quickHintPrimary]}>{hint}</Text>
      ) : null}
    </Pressable>
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
  page: { padding: 12, paddingBottom: 72, gap: 10 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 2,
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
    fontSize: 22,
    color: colors.ink,
    marginTop: 4,
    lineHeight: 28,
  },
  subtle: { fontSize: 12, color: colors.muted, marginTop: 4, lineHeight: 16 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.teal,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: { color: colors.white, fontSize: 12, fontWeight: "800" },
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
    borderRadius: 18,
    padding: 14,
    gap: 4,
    ...shadow,
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroIcon: {
    width: 28,
    height: 28,
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
    fontSize: 28,
    lineHeight: 32,
    marginTop: 8,
  },
  amountPositive: { color: colors.teal },
  amountNegative: { color: colors.coral },
  heroSentence: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.ink,
    marginTop: 2,
    lineHeight: 16,
  },
  heroMeta: { fontSize: 11, color: colors.muted, lineHeight: 16, marginTop: 2 },
  muted: { fontSize: 11, color: colors.muted, lineHeight: 15 },
  split: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    marginTop: 10,
    paddingTop: 10,
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
    fontSize: 14,
    marginTop: 2,
  },
  negative: {
    color: colors.coral,
    fontWeight: "800",
    fontSize: 14,
    marginTop: 2,
  },
  negativeLarge: { fontSize: 14 },
  splitHelp: { fontSize: 10, color: colors.muted, marginTop: 1 },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "space-between",
  },
  quick: {
    width: "48%",
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: "center",
    gap: 6,
    minHeight: 80,
    justifyContent: "center",
  },
  quickPrimary: {
    backgroundColor: colors.teal,
    borderColor: colors.teal,
    ...shadow,
    elevation: 3,
  },
  quickPressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
  quickIcon: {
    width: 28,
    height: 28,
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
  quickHintPrimary: { color: colors.onPrimaryMuted },
  sectionHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginTop: 2,
    marginBottom: 2,
  },
  section: { fontFamily: type.title, fontSize: 18, color: colors.ink },
  sectionMeta: { fontSize: 11, color: colors.muted, fontWeight: "600" },
  sectionLink: { fontSize: 11, color: colors.teal, fontWeight: "700" },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.sage,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 56,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.ink,
    textTransform: "capitalize",
  },
  cardSubtitle: { fontSize: 11, color: colors.muted, marginTop: 2 },
  friend: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.sage,
    alignItems: "center",
    justifyContent: "center",
  },
  friendText: { fontSize: 11, fontWeight: "800", color: colors.teal },
  checkBadge: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: colors.sage,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    backgroundColor: colors.paper,
    borderRadius: 14,
    padding: 20,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: colors.line,
  },
  emptyIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.sage,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { fontFamily: type.title, fontSize: 15, color: colors.ink },
  emptyText: {
    fontSize: 12,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 16,
  },
});
