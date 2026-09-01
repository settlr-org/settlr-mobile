import AntDesign from "@expo/vector-icons/AntDesign";
import { router, useFocusEffect } from "expo-router";
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
import { apiFetch } from "../src/api";
import { colors, shadow, type } from "../src/theme";
import { Button, Card, Empty, ErrorNotice, PageTitle } from "../src/ui";
import type { Friend, Group } from "../src/types";

type Invite = {
  id: string;
  group_id: string;
  group_name: string;
  email: string;
  created_at: string;
};

export default function Invites() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [received, setReceived] = useState<Invite[]>([]);
  const [groupId, setGroupId] = useState("");
  const [friendId, setFriendId] = useState("");
  const [sent, setSent] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [g, f, i] = await Promise.all([
        apiFetch<{ data: Group[] }>("/api/v1/groups"),
        apiFetch<{ data: Friend[] }>("/api/v1/friends"),
        apiFetch<{ data: Invite[] }>("/api/v1/invites"),
      ]);
      setGroups(g.data);
      setFriends(f.data);
      setReceived(i.data);
      if (!groupId) setGroupId(g.data[0]?.id || "");
      if (!friendId) setFriendId(f.data[0]?.user_id || "");
      setError("");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not load invitations.",
      );
    } finally {
      setLoading(false);
    }
  }, [groupId, friendId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const invite = async () => {
    if (!groupId || !friendId) {
      setError("Choose a group and a friend.");
      return;
    }
    const friend = friends.find((item) => item.user_id === friendId);
    setError("");
    try {
      await apiFetch(`/api/v1/groups/${groupId}/invites`, {
        method: "POST",
        body: JSON.stringify({ user_id: friendId }),
      });
      setSent(`Invitation sent to ${friend?.name || "your friend"}.`);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not send invitation.",
      );
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
        <PageTitle
          eyebrow="BRING PEOPLE IN"
          title="Invitations"
          description="Invite accepted friends and keep pending group invitations together."
        />
        {error ? (
          <ErrorNotice message={error} retry={() => void load()} />
        ) : null}
        {sent ? (
          <View style={s.success}>
            <Text style={s.successText}>{sent}</Text>
          </View>
        ) : null}
        <Card>
          <Text style={s.section}>Invite a friend</Text>
          <Text style={s.meta}>
            Accepted friends receive a secure link that expires in seven days
          </Text>
          {groups.length ? (
            <>
              <Text style={s.label}>Group</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.chips}
              >
                {groups.map((group) => (
                  <Pressable
                    key={group.id}
                    onPress={() => setGroupId(group.id)}
                    style={[s.chip, groupId === group.id && s.chipActive]}
                  >
                    <Text
                      style={[
                        s.chipText,
                        groupId === group.id && s.chipTextActive,
                      ]}
                    >
                      {group.name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
              {friends.length ? (
                <>
                  <Text style={s.label}>Friend</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={s.chips}
                  >
                    {friends.map((friend) => (
                      <Pressable
                        key={friend.user_id}
                        onPress={() => setFriendId(friend.user_id)}
                        style={[
                          s.chip,
                          friendId === friend.user_id && s.chipActive,
                        ]}
                      >
                        <Text
                          style={[
                            s.chipText,
                            friendId === friend.user_id && s.chipTextActive,
                          ]}
                        >
                          {friend.name}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                  <Button
                    label="Send invitation"
                    icon="mail"
                    onPress={() => void invite()}
                  />
                </>
              ) : (
                <Empty
                  icon="team"
                  title="No friends yet"
                  text="Add a friend before sending a group invitation."
                />
              )}
            </>
          ) : (
            <Empty
              icon="team"
              title="No groups yet"
              text="Create a group before inviting people."
            />
          )}
        </Card>
        <Card>
          <Text style={s.section}>Invitations for you</Text>
          <Text style={s.meta}>{received.length} awaiting your response</Text>
          {received.map((inv) => (
            <View style={s.inviteLine} key={inv.id}>
              <View style={s.inviteIcon}>
                <AntDesign name="mail" size={16} color={colors.teal} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.inviteTitle}>{inv.group_name}</Text>
                <Text style={s.meta}>Sent to {inv.email}</Text>
              </View>
              <Text style={s.hint}>
                Open the link from your email to accept
              </Text>
            </View>
          ))}
          {!received.length ? (
            <Empty
              icon="mail"
              title="No pending invites"
              text="Group invitations sent to your email will appear here."
            />
          ) : null}
        </Card>
        <Pressable
          style={s.link}
          onPress={() => router.push("/(tabs)/friends")}
        >
          <AntDesign name="team" size={14} color={colors.teal} />
          <Text style={s.linkText}>Go to friends</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  page: { padding: 18, paddingBottom: 110, gap: 14 },
  section: { color: colors.ink, fontFamily: type.title, fontSize: 22 },
  meta: { color: colors.muted, fontSize: 10, marginTop: 3, lineHeight: 14 },
  label: { color: colors.ink, fontSize: 11, fontWeight: "800", marginTop: 12 },
  chips: { gap: 8, paddingVertical: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.paper,
  },
  chipActive: { backgroundColor: colors.teal, borderColor: colors.teal },
  chipText: { color: colors.ink, fontSize: 11, fontWeight: "700" },
  chipTextActive: { color: colors.white },
  success: {
    backgroundColor: colors.sage,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  successText: { color: colors.teal, fontSize: 11, fontWeight: "700" },
  inviteLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  inviteIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: colors.sage,
    alignItems: "center",
    justifyContent: "center",
  },
  inviteTitle: { color: colors.ink, fontSize: 12, fontWeight: "800" },
  hint: { color: colors.muted, fontSize: 9, maxWidth: 110, textAlign: "right" },
  link: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    justifyContent: "center",
    padding: 12,
  },
  linkText: { color: colors.teal, fontSize: 11, fontWeight: "800" },
});
