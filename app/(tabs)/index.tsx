import AntDesign from "@expo/vector-icons/AntDesign";
import { Link, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { apiFetch } from "../../src/api";
import { useSession } from "../../src/session";
import { colors, shadow, type } from "../../src/theme";

type Balance = {
  summary: { you_are_owed: number; you_owe: number; net_balance: number };
  currency: string;
  data: unknown[];
};
type Friend = { user_id: string; name: string };
type Event = {
  id: string;
  type: string;
  created_at: string;
  payload?: { description?: string };
};
const fmt = (n: number, c = "NPR") =>
  new Intl.NumberFormat("en-NP", {
    style: "currency",
    currency: c,
    maximumFractionDigits: 2,
  }).format(n / 100);
const initials = (n: string) =>
  n
    .split(/\s+/)
    .slice(0, 2)
    .map((x) => x[0])
    .join("")
    .toUpperCase();
export default function Home() {
  const { user } = useSession();
  const [balance, setBalance] = useState<Balance>();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setError("");
    try {
      const [b, f, a] = await Promise.all([
        apiFetch<Balance>("/api/v1/me/balances"),
        apiFetch<{ data: Friend[] }>("/api/v1/friends"),
        apiFetch<{ data: Event[] }>("/api/v1/activity?limit=5"),
      ]);
      setBalance(b);
      setFriends(f.data);
      setEvents(a.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load overview.");
    } finally {
      setLoading(false);
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );
  if (loading)
    return (
      <SafeAreaView style={s.safe}>
        <ActivityIndicator style={{ flex: 1 }} color={colors.teal} />
      </SafeAreaView>
    );
  const c = balance?.currency || "NPR";
  return (
    <SafeAreaView style={s.safe}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={load}
            tintColor={colors.teal}
          />
        }
        contentContainerStyle={s.page}
      >
        <View style={s.header}>
          <View>
            <Text style={s.eyebrow}>SETTLR WORKSPACE</Text>
            <Text style={s.title}>Overview</Text>
          </View>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initials(user?.name || "You")}</Text>
          </View>
        </View>
        {error ? <Text style={s.error}>{error}</Text> : null}
        <View style={s.hero}>
          <View style={s.heroTop}>
            <Text style={s.heroLabel}>NET BALANCE</Text>
            <AntDesign name="wallet" size={19} color={colors.teal} />
          </View>
          <Text
            style={[
              s.heroAmount,
              (balance?.summary.net_balance || 0) < 0 && s.negative,
            ]}
          >
            {fmt(balance?.summary.net_balance || 0, c)}
          </Text>
          <Text style={s.muted}>
            Across {balance?.data.length || 0} active groups
          </Text>
          <View style={s.split}>
            <View>
              <Text style={s.miniLabel}>YOU ARE OWED</Text>
              <Text style={s.positive}>
                {fmt(balance?.summary.you_are_owed || 0, c)}
              </Text>
            </View>
            <View>
              <Text style={s.miniLabel}>YOU OWE</Text>
              <Text style={s.negative}>
                {fmt(balance?.summary.you_owe || 0, c)}
              </Text>
            </View>
          </View>
        </View>
        <View style={s.actions}>
          <Quick href="/add" icon="plus" label="Add expense" />
          <Quick href="/(tabs)/groups" icon="team" label="Groups" />
          <Quick href="/(tabs)/activity" icon="profile" label="Activity" />
        </View>
        <Header title="Friends" meta={`${friends.length} connected`} />
        {friends.slice(0, 4).map((f) => (
          <View style={s.card} key={f.user_id}>
            <View style={s.friend}>
              <Text style={s.friendText}>{initials(f.name)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.cardTitle}>{f.name}</Text>
              <Text style={s.muted}>Connected on Settlr</Text>
            </View>
            <AntDesign name="check-circle" color={colors.teal} size={17} />
          </View>
        ))}
        {!friends.length ? (
          <Empty icon="team" text="Accepted friends will appear here." />
        ) : null}
        <Header title="Latest activity" meta={`${events.length} updates`} />
        {events.map((e) => (
          <View style={s.card} key={e.id}>
            <View style={s.eventIcon}>
              <AntDesign name="notification" size={17} color={colors.teal} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.cardTitle}>
                {e.payload?.description ||
                  e.type.toLowerCase().replaceAll("_", " ")}
              </Text>
              <Text style={s.muted}>
                {new Date(e.created_at).toLocaleDateString()}
              </Text>
            </View>
          </View>
        ))}
        {!events.length ? (
          <Empty icon="profile" text="Your group updates will appear here." />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
function Quick({
  href,
  icon,
  label,
}: {
  href: "/add" | "/(tabs)/groups" | "/(tabs)/activity";
  icon: string;
  label: string;
}) {
  return (
    <Link href={href} asChild>
      <Pressable style={s.quick}>
        <AntDesign name={icon as never} color={colors.teal} size={21} />
        <Text style={s.quickText}>{label}</Text>
      </Pressable>
    </Link>
  );
}
function Header({ title, meta }: { title: string; meta: string }) {
  return (
    <View style={s.sectionHead}>
      <Text style={s.section}>{title}</Text>
      <Text style={s.muted}>{meta}</Text>
    </View>
  );
}
function Empty({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={s.empty}>
      <AntDesign name={icon as never} size={24} color={colors.teal} />
      <Text style={s.muted}>{text}</Text>
    </View>
  );
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  page: { padding: 18, paddingBottom: 110 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 22,
  },
  eyebrow: {
    fontSize: 9,
    letterSpacing: 2,
    color: colors.teal,
    fontWeight: "800",
  },
  title: {
    fontFamily: type.title,
    fontSize: 32,
    color: colors.ink,
    marginTop: 3,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.white, fontSize: 13, fontWeight: "800" },
  hero: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 22,
    padding: 21,
    ...shadow,
  },
  heroTop: { flexDirection: "row", justifyContent: "space-between" },
  heroLabel: {
    fontSize: 9,
    letterSpacing: 1.5,
    color: colors.muted,
    fontWeight: "800",
  },
  heroAmount: {
    fontFamily: type.title,
    color: colors.teal,
    fontSize: 38,
    marginTop: 13,
  },
  muted: { fontSize: 10, color: colors.muted, marginTop: 3 },
  split: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    marginTop: 18,
    paddingTop: 16,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  miniLabel: {
    fontSize: 8,
    letterSpacing: 1.3,
    color: colors.muted,
    fontWeight: "800",
  },
  positive: {
    color: colors.teal,
    fontWeight: "800",
    fontSize: 14,
    marginTop: 4,
  },
  negative: { color: colors.coral, fontWeight: "800" },
  actions: { flexDirection: "row", gap: 9, marginVertical: 18 },
  quick: {
    flex: 1,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    gap: 7,
  },
  quickText: { fontSize: 9, color: colors.ink, fontWeight: "700" },
  sectionHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginTop: 13,
    marginBottom: 9,
  },
  section: { fontFamily: type.title, fontSize: 23, color: colors.ink },
  card: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    padding: 13,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.ink,
    textTransform: "capitalize",
  },
  friend: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: colors.sage,
    alignItems: "center",
    justifyContent: "center",
  },
  friendText: { fontSize: 10, fontWeight: "800", color: colors.teal },
  eventIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: colors.sage,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    backgroundColor: colors.paper,
    borderRadius: 16,
    padding: 25,
    alignItems: "center",
    gap: 8,
  },
  error: { color: colors.coral, fontSize: 11, marginBottom: 12 },
});
