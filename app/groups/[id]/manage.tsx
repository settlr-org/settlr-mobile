import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";
import { apiFetch } from "../../../src/api";
import { colors } from "../../../src/theme";
import {
  Button,
  Card,
  ConfirmAction,
  ErrorNotice,
  Field,
  Loading,
  PageTitle,
  Screen,
} from "../../../src/ui";
import type { Group, Member } from "../../../src/types";

export default function GroupManage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [group, setGroup] = useState<Group>();
  const [members, setMembers] = useState<Member[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("OTHER");
  const [currency, setCurrency] = useState("NPR");
  const [simplify, setSimplify] = useState(false);
  const [invite, setInvite] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    try {
      const [g, m] = await Promise.all([
        apiFetch<Group>(`/api/v1/groups/${id}`),
        apiFetch<{ data: Member[] }>(`/api/v1/groups/${id}/members`),
      ]);
      setGroup(g);
      setMembers(m.data);
      setName(g.name);
      setDescription(g.description);
      setType(g.group_type);
      setCurrency(g.currency);
      setSimplify(g.simplify_debts);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to load group settings.",
      );
    } finally {
      setLoading(false);
    }
  }, [id]);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );
  const save = async () => {
    try {
      await apiFetch(`/api/v1/groups/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name,
          description,
          group_type: type,
          currency,
          simplify_debts: simplify,
        }),
      });
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not save group.",
      );
    }
  };
  const sendInvite = async () => {
    try {
      await apiFetch(`/api/v1/groups/${id}/invites`, {
        method: "POST",
        body: JSON.stringify({ email: invite }),
      });
      setInvite("");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not send invitation.",
      );
    }
  };
  if (loading)
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  return (
    <Screen>
      <PageTitle
        eyebrow="GROUP CONTROL ROOM"
        title={group?.name || "Group settings"}
        description="Manage this shared ledger."
      />
      {error ? <ErrorNotice message={error} retry={() => void load()} /> : null}
      <Card>
        <Text style={s.section}>Group details</Text>
        <Field label="Name" value={name} onChangeText={setName} />
        <Field
          label="Description"
          value={description}
          onChangeText={setDescription}
        />
        <Field
          label="Type"
          value={type}
          onChangeText={setType}
          autoCapitalize="characters"
        />
        <Field
          label="Currency"
          value={currency}
          onChangeText={setCurrency}
          autoCapitalize="characters"
        />
        <View style={s.row}>
          <Text style={[s.item, { flex: 1 }]}>Simplify repayments</Text>
          <Switch
            value={simplify}
            onValueChange={setSimplify}
            trackColor={{ true: colors.teal }}
          />
        </View>
        <Button label="Save group settings" onPress={() => void save()} />
      </Card>
      <Card>
        <Text style={s.section}>Invite a friend</Text>
        <Field
          label="Friend email"
          value={invite}
          onChangeText={setInvite}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Button
          label="Send invitation"
          secondary
          onPress={() => void sendInvite()}
        />
      </Card>
      <Card>
        <Text style={s.section}>Members</Text>
        {members.map((member) => (
          <View style={s.row} key={member.id}>
            <View style={{ flex: 1 }}>
              <Text style={s.item}>{member.name}</Text>
              <Text style={s.meta}>{member.role}</Text>
            </View>
            <Button
              label={member.role === "ADMIN" ? "Make member" : "Make admin"}
              secondary
              onPress={() =>
                void apiFetch(`/api/v1/groups/${id}/members/${member.id}`, {
                  method: "PATCH",
                  body: JSON.stringify({
                    role: member.role === "ADMIN" ? "MEMBER" : "ADMIN",
                  }),
                }).then(load)
              }
            />
          </View>
        ))}
      </Card>
      <Card>
        <Button
          label="Leave group"
          danger
          onPress={() =>
            void apiFetch(`/api/v1/groups/${id}/leave`, {
              method: "POST",
            }).then(() => router.replace("/(tabs)/groups"))
          }
        />
        <ConfirmAction
          title="Archive group?"
          description="The group will no longer be active."
          label="Archive"
          onConfirm={async () => {
            await apiFetch(`/api/v1/groups/${id}/archive`, { method: "POST" });
            router.replace("/(tabs)/groups");
          }}
        >
          {(open) => <Button label="Archive group" danger onPress={open} />}
        </ConfirmAction>
        <ConfirmAction
          title="Delete group?"
          description="This permanently removes the group."
          onConfirm={async () => {
            await apiFetch(`/api/v1/groups/${id}`, { method: "DELETE" });
            router.replace("/(tabs)/groups");
          }}
        >
          {(open) => <Button label="Delete group" danger onPress={open} />}
        </ConfirmAction>
      </Card>
    </Screen>
  );
}
const s = StyleSheet.create({
  section: { color: colors.ink, fontFamily: "serif", fontSize: 22 },
  row: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    borderTopWidth: 1,
    borderColor: colors.line,
  },
  item: { color: colors.ink, fontSize: 12, fontWeight: "800" },
  meta: { color: colors.muted, fontSize: 10 },
});
