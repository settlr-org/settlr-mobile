import AntDesign from "@expo/vector-icons/AntDesign";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { apiFetch } from "../../src/api";
import { colors, shadow, type } from "../../src/theme";
import { initials } from "../../src/utils/initials";

type Friend = {
  friendship_id: string;
  user_id: string;
  name: string;
  avatar_url?: string;
  status: string;
};
type FriendRequest = {
  friendship_id: string;
  from_user: string;
  name: string;
  avatar_url?: string;
  created_at: string;
};
type SearchUser = { id: string; name: string; email?: string };

export default function Friends() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [results, setResults] = useState<SearchUser[]>([]);
  const [query, setQuery] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sent, setSent] = useState("");
  const [searching, setSearching] = useState(false);

  const load = useCallback(async () => {
    try {
      const [f, r] = await Promise.all([
        apiFetch<{ data: Friend[] }>("/api/v1/friends"),
        apiFetch<{ data: FriendRequest[] }>("/api/v1/friends/requests"),
      ]);
      setFriends(f.data);
      setRequests(r.data);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load friends.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const search = async () => {
    if (query.trim().length < 2) return;
    setSearching(true);
    try {
      const res = await apiFetch<{ data: SearchUser[] }>(
        `/api/v1/users/search?q=${encodeURIComponent(query.trim())}`,
      );
      setResults(res.data);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed.");
    } finally {
      setSearching(false);
    }
  };

  const act = async (path: string, method = "POST") => {
    try {
      await apiFetch(path, { method });
      await load();
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed.");
    }
  };

  const inviteByEmail = async () => {
    if (!inviteEmail.trim()) return;
    try {
      await apiFetch("/api/v1/friends/invite", {
        method: "POST",
        body: JSON.stringify({ email: inviteEmail.trim() }),
      });
      setSent(`Invitation sent to ${inviteEmail.trim()}.`);
      setInviteEmail("");
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send invitation.");
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <ActivityIndicator style={{ flex: 1 }} color={colors.teal} />
      </SafeAreaView>
    );
  }

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
        <Text style={s.eyebrow}>YOUR CIRCLE</Text>
        <Text style={s.title}>Friends</Text>
        <Text style={s.muted}>
          Find people, manage requests, and keep direct ledgers.
        </Text>
        {error ? <Text style={s.error}>{error}</Text> : null}
        {sent ? <Text style={s.success}>{sent}</Text> : null}

        <View style={s.panel}>
          <Text style={s.panelTitle}>Find people</Text>
          <Text style={s.panelMeta}>Search by name or email</Text>
          <View style={s.searchRow}>
            <View style={s.searchBox}>
              <AntDesign name="search" size={16} color={colors.muted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Name or email address"
                placeholderTextColor={colors.muted}
                style={s.searchInput}
                autoCapitalize="none"
                autoCorrect={false}
                onSubmitEditing={search}
                returnKeyType="search"
              />
            </View>
            <Pressable
              onPress={search}
              style={[s.searchBtn, searching && { opacity: 0.7 }]}
              disabled={searching}
            >
              <Text style={s.searchBtnText}>{searching ? "…" : "Search"}</Text>
            </Pressable>
          </View>
          {results.map((u) => (
            <View style={s.memberLine} key={u.id}>
              <View style={s.avatarSoft}>
                <Text style={s.avatarSoftText}>{initials(u.name)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.cardTitle}>{u.name}</Text>
                <Text style={s.muted}>{u.email || "Settlr member"}</Text>
              </View>
              <Pressable
                style={s.addBtn}
                onPress={() => void act(`/api/v1/friends/${u.id}/request`)}
              >
                <AntDesign name="user-add" size={16} color={colors.teal} />
                <Text style={s.addBtnText}>Add</Text>
              </Pressable>
            </View>
          ))}
        </View>

        <View style={s.panel}>
          <Text style={s.panelTitle}>Invite by email</Text>
          <Text style={s.panelMeta}>Add a friend directly</Text>
          <View style={s.inviteRow}>
            <View style={s.inviteBox}>
              <AntDesign name="mail" size={16} color={colors.muted} />
              <TextInput
                value={inviteEmail}
                onChangeText={setInviteEmail}
                placeholder="friend@example.com"
                placeholderTextColor={colors.muted}
                style={s.searchInput}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
                onSubmitEditing={inviteByEmail}
                returnKeyType="send"
              />
            </View>
            <Pressable onPress={inviteByEmail} style={s.inviteBtn}>
              <AntDesign name="arrow-right" size={14} color={colors.white} />
              <Text style={s.inviteBtnText}>Send</Text>
            </Pressable>
          </View>
        </View>

        <View style={s.panel}>
          <View style={s.panelHead}>
            <Text style={s.panelTitle}>Your friends</Text>
            <Text style={s.badge}>{friends.length} connected</Text>
          </View>
          {friends.map((f) => (
            <View style={s.friendCard} key={f.user_id}>
              <View style={s.avatar}>
                <Text style={s.avatarText}>{initials(f.name)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.cardTitle}>{f.name}</Text>
                <Text style={s.muted}>Direct expenses and settlements</Text>
              </View>
              <View style={s.statusPill}>
                <Text style={s.statusPillText}>Connected</Text>
              </View>
            </View>
          ))}
          {!friends.length ? (
            <View style={s.empty}>
              <AntDesign name="team" size={24} color={colors.teal} />
              <Text style={s.muted}>
                Search for someone you know and send a friend request.
              </Text>
            </View>
          ) : null}
        </View>

        <View style={s.panel}>
          <View style={s.panelHead}>
            <Text style={s.panelTitle}>Requests</Text>
            <Text style={s.badge}>{requests.length} waiting</Text>
          </View>
          {requests.map((r) => (
            <View style={s.requestCard} key={r.friendship_id}>
              <View style={s.avatarSoft}>
                <Text style={s.avatarSoftText}>{initials(r.name)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.cardTitle}>{r.name}</Text>
                <Text style={s.muted}>Wants to connect</Text>
              </View>
              <Pressable
                onPress={() =>
                  void act(`/api/v1/friends/${r.from_user}/accept`)
                }
                style={s.accept}
                accessibilityLabel={`Accept ${r.name}`}
              >
                <AntDesign name="check" size={16} color={colors.white} />
              </Pressable>
              <Pressable
                onPress={() =>
                  void act(`/api/v1/friends/${r.from_user}/reject`)
                }
                style={s.reject}
                accessibilityLabel={`Reject ${r.name}`}
              >
                <AntDesign name="close" size={16} color={colors.coral} />
              </Pressable>
            </View>
          ))}
          {!requests.length ? (
            <View style={s.empty}>
              <Text style={s.emptyTitle}>No pending requests</Text>
              <Text style={s.muted}>New requests will appear here.</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  page: { padding: 18, paddingBottom: 110, gap: 14 },
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
  muted: { color: colors.muted, fontSize: 10, marginTop: 3, lineHeight: 14 },
  error: {
    color: colors.coral,
    fontSize: 11,
    backgroundColor: "#fde8e8",
    padding: 10,
    borderRadius: 10,
  },
  success: {
    color: colors.teal,
    fontSize: 11,
    backgroundColor: colors.sage,
    padding: 10,
    borderRadius: 10,
  },
  panel: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 18,
    padding: 16,
    gap: 10,
    ...shadow,
  },
  panelHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  panelTitle: { fontFamily: type.title, fontSize: 18, color: colors.ink },
  panelMeta: {
    fontSize: 10,
    color: colors.muted,
    marginTop: -6,
    marginBottom: 4,
  },
  badge: {
    fontSize: 10,
    color: colors.muted,
    backgroundColor: colors.cream,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    overflow: "hidden",
  },
  searchRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: { flex: 1, color: colors.ink, fontSize: 12, paddingVertical: 0 },
  searchBtn: {
    backgroundColor: colors.teal,
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBtnText: { color: colors.white, fontWeight: "800", fontSize: 12 },
  memberLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  avatarSoft: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: colors.sage,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarSoftText: { fontSize: 10, fontWeight: "800", color: colors.teal },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: colors.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 10, fontWeight: "800", color: colors.white },
  cardTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.ink,
    textTransform: "capitalize",
  },
  addBtn: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 12,
    backgroundColor: colors.paper,
  },
  addBtnText: { fontSize: 11, fontWeight: "700", color: colors.teal },
  inviteRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  inviteBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  inviteBtn: {
    flexDirection: "row",
    gap: 6,
    backgroundColor: colors.teal,
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  inviteBtnText: { color: colors.white, fontWeight: "800", fontSize: 12 },
  friendCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  statusPill: {
    backgroundColor: colors.sage,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusPillText: { fontSize: 10, fontWeight: "700", color: colors.teal },
  requestCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  accept: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  reject: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: { alignItems: "center", padding: 18, gap: 8 },
  emptyTitle: { fontFamily: type.title, fontSize: 16, color: colors.ink },
});
