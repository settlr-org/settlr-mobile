import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";
import { apiFetch } from "../../../src/api";
import { shareApiFile } from "../../../src/files";
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
import type { ActivityEvent, Friend, Group, Member } from "../../../src/types";
import { labelize, money } from "../../../src/types";

type Recurring = {
  id: string;
  description: string;
  amount: number;
  currency: string;
  frequency: string;
  next_run_at: string;
  active: boolean;
};
type Stats = {
  total_spent: number;
  average_expense: number;
  expense_count: number;
  by_category: { category: string; total: number; count: number }[];
};

export default function GroupManage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [group, setGroup] = useState<Group>();
  const [members, setMembers] = useState<Member[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [recurring, setRecurring] = useState<Recurring[]>([]);
  const [stats, setStats] = useState<Stats>();
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("OTHER");
  const [currency, setCurrency] = useState("NPR");
  const [simplify, setSimplify] = useState(false);
  const [information, setInformation] = useState("");
  const [invite, setInvite] = useState("");
  const [friendId, setFriendId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    try {
      const [g, m, f, r, report, activity] = await Promise.all([
        apiFetch<Group>(`/api/v1/groups/${id}`),
        apiFetch<{ data: Member[] }>(`/api/v1/groups/${id}/members`),
        apiFetch<{ data: Friend[] }>("/api/v1/friends"),
        apiFetch<{ data: Recurring[] }>(`/api/v1/groups/${id}/recurring`),
        apiFetch<Stats>(`/api/v1/groups/${id}/stats?range=all`),
        apiFetch<{ data: ActivityEvent[] }>(
          `/api/v1/groups/${id}/activity?limit=20`,
        ),
      ]);
      setGroup(g);
      setMembers(m.data);
      setFriends(f.data);
      setRecurring(r.data);
      setStats(report);
      setEvents(activity.data);
      setName(g.name);
      setDescription(g.description);
      setType(g.group_type);
      setCurrency(g.currency);
      setSimplify(g.simplify_debts);
      setInformation(g.information || "");
      setFriendId(
        f.data.find(
          (friend) => !m.data.some((member) => member.id === friend.user_id),
        )?.user_id || "",
      );
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
          information,
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
  const addFriend = async () => {
    if (!friendId) return;
    try {
      await apiFetch(`/api/v1/groups/${id}/members`, {
        method: "POST",
        body: JSON.stringify({ user_id: friendId }),
      });
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not add this friend.",
      );
    }
  };
  const updateRecurring = async (item: Recurring, active: boolean) => {
    try {
      await apiFetch(`/api/v1/recurring/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ active }),
      });
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not update schedule.",
      );
    }
  };
  if (loading || !group)
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
          label="Group information"
          value={information}
          onChangeText={setInformation}
          multiline
          placeholder="Optional details for members"
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
        <Text style={s.section}>Add an accepted friend</Text>
        {friends.filter(
          (friend) => !members.some((member) => member.id === friend.user_id),
        ).length ? (
          <>
            <View style={s.friendChoices}>
              {friends
                .filter(
                  (friend) =>
                    !members.some((member) => member.id === friend.user_id),
                )
                .map((friend) => (
                  <Button
                    key={friend.user_id}
                    label={friend.name}
                    secondary={friendId !== friend.user_id}
                    onPress={() => setFriendId(friend.user_id)}
                  />
                ))}
            </View>
            <Button label="Add to group" onPress={() => void addFriend()} />
          </>
        ) : (
          <Text style={s.meta}>All of your friends are already members.</Text>
        )}
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
      <RecurringPanel
        group={group}
        members={members}
        recurring={recurring}
        onSaved={load}
        onToggle={updateRecurring}
      />
      <Card>
        <Text style={s.section}>Spending report</Text>
        {stats ? (
          <>
            <View style={s.stats}>
              <Metric
                label="Total spent"
                value={money(stats.total_spent, group.currency)}
              />
              <Metric
                label="Average"
                value={money(stats.average_expense, group.currency)}
              />
              <Metric label="Expenses" value={String(stats.expense_count)} />
            </View>
            {stats.by_category.map((row) => (
              <View key={row.category} style={s.row}>
                <View style={{ flex: 1 }}>
                  <Text style={s.item}>{row.category}</Text>
                  <Text style={s.meta}>{row.count} entries</Text>
                </View>
                <Text style={s.reportAmount}>
                  {money(row.total, group.currency)}
                </Text>
              </View>
            ))}
          </>
        ) : null}
        <View style={s.exportRow}>
          <Button
            label="Export CSV"
            secondary
            onPress={() =>
              void shareApiFile(
                `/api/v1/groups/${id}/export.csv`,
                `${group.name}.csv`,
              ).catch((cause: unknown) =>
                setError(
                  cause instanceof Error
                    ? cause.message
                    : "Could not export CSV.",
                ),
              )
            }
          />
          <Button
            label="Export JSON"
            secondary
            onPress={() =>
              void shareApiFile(
                `/api/v1/groups/${id}/export.json`,
                `${group.name}.json`,
              ).catch((cause: unknown) =>
                setError(
                  cause instanceof Error
                    ? cause.message
                    : "Could not export JSON.",
                ),
              )
            }
          />
        </View>
      </Card>
      <Card>
        <Text style={s.section}>Group activity</Text>
        {events.map((event) => (
          <View style={s.row} key={event.id}>
            <View style={{ flex: 1 }}>
              <Text style={s.item}>{labelize(event.type)}</Text>
              <Text style={s.meta}>
                {new Date(event.created_at).toLocaleString()}
              </Text>
            </View>
          </View>
        ))}
        {!events.length ? (
          <Text style={s.meta}>Group changes will appear here.</Text>
        ) : null}
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

function RecurringPanel({
  group,
  members,
  recurring,
  onSaved,
  onToggle,
}: {
  group: Group;
  members: Member[];
  recurring: Recurring[];
  onSaved: () => Promise<void>;
  onToggle: (item: Recurring, active: boolean) => Promise<void>;
}) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState("MONTHLY");
  const [paidBy, setPaidBy] = useState(members[0]?.id || "");
  const [error, setError] = useState("");
  const create = async () => {
    const cents = Math.round(Number(amount) * 100);
    if (
      !description.trim() ||
      !Number.isFinite(cents) ||
      cents <= 0 ||
      !paidBy
    ) {
      setError("Enter a description, amount, and payer.");
      return;
    }
    try {
      await apiFetch(`/api/v1/groups/${group.id}/recurring`, {
        method: "POST",
        body: JSON.stringify({
          description: description.trim(),
          amount: cents,
          currency: group.currency,
          paid_by: paidBy,
          frequency,
          start_date: new Date().toISOString().slice(0, 10),
          split_mode: "EQUAL",
          splits: members.map((member) => ({ user_id: member.id })),
        }),
      });
      setDescription("");
      setAmount("");
      await onSaved();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not create recurring expense.",
      );
    }
  };
  const remove = async (item: Recurring) => {
    try {
      await apiFetch(`/api/v1/recurring/${item.id}`, { method: "DELETE" });
      await onSaved();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not delete schedule.",
      );
    }
  };
  return (
    <Card>
      <Text style={s.section}>Recurring expenses</Text>
      <Field
        label="Description"
        value={description}
        onChangeText={setDescription}
        placeholder="Monthly rent"
      />
      <Field
        label={`Amount (${group.currency})`}
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        placeholder="0.00"
      />
      <Text style={s.label}>Paid by</Text>
      <View style={s.friendChoices}>
        {members.map((member) => (
          <Button
            key={member.id}
            label={member.name}
            secondary={paidBy !== member.id}
            onPress={() => setPaidBy(member.id)}
          />
        ))}
      </View>
      <Text style={s.label}>Frequency</Text>
      <View style={s.friendChoices}>
        {["DAILY", "WEEKLY", "MONTHLY", "YEARLY"].map((item) => (
          <Button
            key={item}
            label={labelize(item)}
            secondary={frequency !== item}
            onPress={() => setFrequency(item)}
          />
        ))}
      </View>
      <Button label="Create schedule" onPress={() => void create()} />
      {error ? <ErrorNotice message={error} /> : null}
      {recurring.map((item) => (
        <View style={s.row} key={item.id}>
          <View style={{ flex: 1 }}>
            <Text style={s.item}>{item.description}</Text>
            <Text style={s.meta}>
              {money(item.amount, item.currency)} · {labelize(item.frequency)} ·
              next {item.next_run_at.slice(0, 10)}
            </Text>
          </View>
          <Button
            label={item.active ? "Pause" : "Resume"}
            secondary
            onPress={() => void onToggle(item, !item.active)}
          />
          <ConfirmAction
            title="Delete recurring expense?"
            description={`“${item.description}” will no longer be scheduled.`}
            label="Delete schedule"
            onConfirm={() => remove(item)}
          >
            {(open) => <Button label="Delete" danger onPress={open} />}
          </ConfirmAction>
        </View>
      ))}
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={s.metricLabel}>{label}</Text>
      <Text style={s.metric}>{value}</Text>
    </View>
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
  label: { color: colors.ink, fontSize: 11, fontWeight: "800" },
  friendChoices: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  stats: { flexDirection: "row", gap: 8 },
  metricLabel: {
    color: colors.muted,
    fontSize: 8,
    letterSpacing: 0.8,
    fontWeight: "800",
  },
  metric: { color: colors.teal, fontSize: 13, fontWeight: "800", marginTop: 4 },
  reportAmount: { color: colors.teal, fontSize: 11, fontWeight: "800" },
  exportRow: { flexDirection: "row", gap: 8 },
});
