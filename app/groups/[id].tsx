import AntDesign from "@expo/vector-icons/AntDesign";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { apiFetch } from "../../src/api";
import { useSession } from "../../src/session";
import { colors } from "../../src/theme";
import {
  Button,
  Card,
  ConfirmAction,
  Empty,
  ErrorNotice,
  Field,
  Loading,
  PageTitle,
  Screen,
  styles,
} from "../../src/ui";
import type {
  Debt,
  Expense,
  Group,
  Member,
  Settlement,
  Split,
} from "../../src/types";
import { labelize, money } from "../../src/types";

type Balances = {
  data: { user_id: string; amount: number }[];
  currency: string;
};
type Tab = "expenses" | "balances" | "members" | "settlements";
export default function GroupDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const [group, setGroup] = useState<Group>();
  const [members, setMembers] = useState<Member[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [balances, setBalances] = useState<Balances>();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [tab, setTab] = useState<Tab>("expenses");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [settlementOpen, setSettlementOpen] = useState(false);
  const [memberOpen, setMemberOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const load = useCallback(async () => {
    try {
      const [g, m, e, b, d, s] = await Promise.all([
        apiFetch<Group>(`/api/v1/groups/${id}`),
        apiFetch<{ data: Member[] }>(`/api/v1/groups/${id}/members`),
        apiFetch<{ data: Expense[] }>(
          `/api/v1/groups/${id}/expenses?limit=100`,
        ),
        apiFetch<Balances>(`/api/v1/groups/${id}/balances`),
        apiFetch<{ data: Debt[] }>(`/api/v1/groups/${id}/debts`),
        apiFetch<{ data: Settlement[] }>(
          `/api/v1/groups/${id}/settlements?limit=100`,
        ),
      ]);
      setGroup(g);
      setMembers(m.data);
      setExpenses(e.data);
      setBalances(b);
      setDebts(d.data);
      setSettlements(s.data);
      setError("");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to open this group.",
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
  const names = useMemo(
    () => Object.fromEntries(members.map((member) => [member.id, member.name])),
    [members],
  );
  if (loading)
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  if (!group)
    return (
      <Screen>
        <ErrorNotice
          message={error || "Group not found."}
          retry={() => void load()}
        />
      </Screen>
    );
  const visible = expenses.filter((expense) =>
    expense.description.toLowerCase().includes(filter.toLowerCase()),
  );
  return (
    <Screen>
      <PageTitle
        eyebrow="SHARED LEDGER"
        title={group.name}
        description={`${group.group_type} · ${group.currency} · ${members.length} members`}
        action={
          <Pressable
            style={s.iconButton}
            onPress={() => router.push(`/groups/${id}/manage`)}
          >
            <AntDesign name="setting" size={19} color={colors.teal} />
          </Pressable>
        }
      />
      {error ? <ErrorNotice message={error} retry={() => void load()} /> : null}
      <View style={s.summary}>
        <Card style={{ flex: 1 }}>
          <Text style={s.metricLabel}>GROUP SPENDING</Text>
          <Text style={s.metric}>
            {money(
              expenses.reduce((sum, expense) => sum + expense.amount, 0),
              group.currency,
            )}
          </Text>
        </Card>
        <Card style={{ flex: 1 }}>
          <Text style={s.metricLabel}>YOUR BALANCE</Text>
          <Text style={s.metric}>
            {money(
              balances?.data.find((item) => item.user_id === user?.id)
                ?.amount || 0,
              group.currency,
            )}
          </Text>
        </Card>
      </View>
      <View style={s.tabs}>
        {(["expenses", "balances", "members", "settlements"] as Tab[]).map(
          (item) => (
            <Pressable
              key={item}
              onPress={() => setTab(item)}
              style={[s.tab, tab === item && s.tabActive]}
            >
              <Text style={[s.tabText, tab === item && s.tabTextActive]}>
                {labelize(item)}
              </Text>
            </Pressable>
          ),
        )}
      </View>
      {tab === "expenses" ? (
        <Card>
          <View style={s.actions}>
            <Button
              label="Add expense"
              icon="plus"
              onPress={() => setExpenseOpen(true)}
            />
            <Field
              label="Search expenses"
              value={filter}
              onChangeText={setFilter}
              placeholder="Search this ledger"
            />
          </View>
          {visible.map((expense) => (
            <View key={expense.id} style={s.row}>
              <Pressable
                style={{ flex: 1 }}
                onPress={() => router.push(`/expenses/${expense.id}`)}
              >
                <Text style={s.rowTitle}>{expense.description}</Text>
                <Text style={s.meta}>
                  {expense.expense_date} · paid by{" "}
                  {names[expense.paid_by] || "Unknown"}
                </Text>
              </Pressable>
              <Text style={s.amount}>
                {money(expense.amount, expense.currency)}
              </Text>
              <ConfirmAction
                title="Delete expense?"
                description={`“${expense.description}” will be permanently removed.`}
                onConfirm={async () => {
                  await apiFetch(`/api/v1/expenses/${expense.id}`, {
                    method: "DELETE",
                  });
                  await load();
                }}
              >
                {(open) => (
                  <Pressable onPress={open}>
                    <AntDesign name="delete" size={17} color={colors.coral} />
                  </Pressable>
                )}
              </ConfirmAction>
            </View>
          ))}
          {!visible.length ? (
            <Empty
              icon="dollar"
              title="No expenses yet"
              text="Add the first shared expense."
            />
          ) : null}
        </Card>
      ) : null}
      {tab === "balances" ? (
        <>
          <Card>
            <Text style={s.section}>Member balances</Text>
            {balances?.data.map((balance) => (
              <View style={s.row} key={balance.user_id}>
                <Text style={[s.rowTitle, { flex: 1 }]}>
                  {names[balance.user_id] || "Member"}
                </Text>
                <Text
                  style={[
                    s.amount,
                    balance.amount < 0 && { color: colors.coral },
                  ]}
                >
                  {money(balance.amount, balances.currency)}
                </Text>
              </View>
            ))}
          </Card>
          <Card>
            <Text style={s.section}>Suggested repayments</Text>
            {debts.map((debt, index) => (
              <View
                key={`${debt.from_user}-${debt.to_user}-${index}`}
                style={s.row}
              >
                <Text style={[s.meta, { flex: 1 }]}>
                  {names[debt.from_user]} pays {names[debt.to_user]}
                </Text>
                <Text style={s.amount}>
                  {money(debt.amount, group.currency)}
                </Text>
              </View>
            ))}
            {!debts.length ? (
              <Empty
                icon="checkcircleo"
                title="All settled"
                text="No repayments are needed."
              />
            ) : (
              <Button
                label="Record settlement"
                icon="swap"
                onPress={() => setSettlementOpen(true)}
              />
            )}
          </Card>
        </>
      ) : null}
      {tab === "members" ? (
        <Card>
          <View style={s.sectionHead}>
            <Text style={s.section}>Members</Text>
            <Button
              label="Add member"
              secondary
              onPress={() => setMemberOpen(true)}
            />
          </View>
          {members.map((member) => (
            <View style={s.row} key={member.id}>
              <View style={{ flex: 1 }}>
                <Text style={s.rowTitle}>{member.name}</Text>
                <Text style={s.meta}>{member.role}</Text>
              </View>
            </View>
          ))}
        </Card>
      ) : null}
      {tab === "settlements" ? (
        <Card>
          <View style={s.sectionHead}>
            <Text style={s.section}>Settlement history</Text>
            <Button
              label="Settle up"
              secondary
              onPress={() => setSettlementOpen(true)}
            />
          </View>
          {settlements.map((settlement) => (
            <View style={s.row} key={settlement.id}>
              <View style={{ flex: 1 }}>
                <Text style={s.rowTitle}>
                  {names[settlement.from_user]} paid {names[settlement.to_user]}
                </Text>
                <Text style={s.meta}>
                  {settlement.settled_at.slice(0, 10)}
                  {settlement.note ? ` · ${settlement.note}` : ""}
                </Text>
              </View>
              <Text style={s.amount}>
                {money(settlement.amount, settlement.currency)}
              </Text>
            </View>
          ))}
          {!settlements.length ? (
            <Empty
              icon="swap"
              title="No settlements yet"
              text="Record a payment when someone settles up."
            />
          ) : null}
        </Card>
      ) : null}
      {expenseOpen ? (
        <ExpenseComposer
          group={group}
          members={members}
          userId={user?.id || ""}
          onClose={() => setExpenseOpen(false)}
          onSaved={load}
        />
      ) : null}
      {settlementOpen ? (
        <SettlementComposer
          group={group}
          debts={debts}
          names={names}
          onClose={() => setSettlementOpen(false)}
          onSaved={load}
        />
      ) : null}
      {memberOpen ? (
        <MemberComposer
          groupId={id}
          onClose={() => setMemberOpen(false)}
          onSaved={load}
        />
      ) : null}
    </Screen>
  );
}
function ExpenseComposer({
  group,
  members,
  userId,
  onClose,
  onSaved,
}: {
  group: Group;
  members: Member[];
  userId: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [payer, setPayer] = useState(userId);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [mode, setMode] = useState<"EQUAL" | "EXACT" | "PERCENTAGE" | "SHARES">(
    "EQUAL",
  );
  const [selected, setSelected] = useState(members.map((member) => member.id));
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const save = async () => {
    const cents = Math.round(Number(amount) * 100);
    if (
      !description.trim() ||
      !Number.isFinite(cents) ||
      cents <= 0 ||
      !selected.length
    ) {
      setError("Enter an expense, amount, and at least one participant.");
      return;
    }
    const splits: Split[] = selected.map((id) => {
      const value = Number(values[id] || 0);
      return mode === "EXACT"
        ? { user_id: id, amount: Math.round(value * 100) }
        : mode === "PERCENTAGE"
          ? { user_id: id, percentage: value }
          : mode === "SHARES"
            ? { user_id: id, shares: value }
            : { user_id: id };
    });
    setBusy(true);
    try {
      await apiFetch(`/api/v1/groups/${group.id}/expenses`, {
        method: "POST",
        headers: { "Idempotency-Key": `${Date.now()}-${Math.random()}` },
        body: JSON.stringify({
          description: description.trim(),
          amount: cents,
          currency: group.currency,
          paid_by: payer,
          expense_date: date,
          notes,
          split_mode: mode,
          splits,
        }),
      });
      await onSaved();
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not save expense.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal transparent visible animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Screen>
          <Card>
            <Text style={s.sheetTitle}>Add shared expense</Text>
            <Field
              label="Description"
              value={description}
              onChangeText={setDescription}
              placeholder="Dinner, taxi, groceries…"
            />
            <Field
              label={`Amount (${group.currency})`}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0.00"
            />
            <Field
              label="Date"
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
            />
            <Field
              label="Notes"
              value={notes}
              onChangeText={setNotes}
              multiline
              placeholder="Optional"
            />
            <Text style={s.label}>Paid by</Text>
            <View style={s.chips}>
              {members.map((member) => (
                <Pressable
                  key={member.id}
                  onPress={() => setPayer(member.id)}
                  style={[s.chip, payer === member.id && s.chipActive]}
                >
                  <Text
                    style={[
                      s.chipText,
                      payer === member.id && s.chipTextActive,
                    ]}
                  >
                    {member.name}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={s.label}>Split</Text>
            <View style={s.chips}>
              {(["EQUAL", "EXACT", "PERCENTAGE", "SHARES"] as const).map(
                (item) => (
                  <Pressable
                    key={item}
                    onPress={() => setMode(item)}
                    style={[s.chip, mode === item && s.chipActive]}
                  >
                    <Text
                      style={[s.chipText, mode === item && s.chipTextActive]}
                    >
                      {labelize(item)}
                    </Text>
                  </Pressable>
                ),
              )}
            </View>
            {members.map((member) => (
              <View style={s.participant} key={member.id}>
                <Pressable
                  style={s.check}
                  onPress={() =>
                    setSelected(
                      selected.includes(member.id)
                        ? selected.filter((id) => id !== member.id)
                        : [...selected, member.id],
                    )
                  }
                >
                  <AntDesign
                    name={
                      (selected.includes(member.id)
                        ? "check-square"
                        : "check-square-o") as never
                    }
                    color={colors.teal}
                    size={18}
                  />
                </Pressable>
                <Text style={[s.rowTitle, { flex: 1 }]}>{member.name}</Text>
                {mode !== "EQUAL" ? (
                  <Field
                    label={
                      mode === "EXACT"
                        ? "Amount"
                        : mode === "PERCENTAGE"
                          ? "%"
                          : "Shares"
                    }
                    value={values[member.id] || ""}
                    onChangeText={(value) =>
                      setValues({ ...values, [member.id]: value })
                    }
                    keyboardType="decimal-pad"
                  />
                ) : null}
              </View>
            ))}
            {error ? <ErrorNotice message={error} /> : null}
            <View style={styles.dialogActions}>
              <Button label="Cancel" secondary onPress={onClose} />
              <Button
                label={busy ? "Saving…" : "Save expense"}
                disabled={busy}
                onPress={() => void save()}
              />
            </View>
          </Card>
        </Screen>
      </View>
    </Modal>
  );
}
function SettlementComposer({
  group,
  debts,
  names,
  onClose,
  onSaved,
}: {
  group: Group;
  debts: Debt[];
  names: Record<string, string>;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const first = debts[0];
  const [from, setFrom] = useState(first?.from_user || "");
  const [to, setTo] = useState(first?.to_user || "");
  const [amount, setAmount] = useState(first ? String(first.amount / 100) : "");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const save = async () => {
    const cents = Math.round(Number(amount) * 100);
    if (!from || !to || !cents) {
      setError("Choose a repayment and amount.");
      return;
    }
    try {
      await apiFetch(`/api/v1/groups/${group.id}/settlements`, {
        method: "POST",
        body: JSON.stringify({
          from_user: from,
          to_user: to,
          amount: cents,
          currency: group.currency,
          note,
          settled_at: new Date().toISOString().slice(0, 10),
        }),
      });
      await onSaved();
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not record settlement.",
      );
    }
  };
  return (
    <Modal transparent visible animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Card>
          <Text style={s.sheetTitle}>Record settlement</Text>
          {debts.map((debt, index) => (
            <Pressable
              key={index}
              onPress={() => {
                setFrom(debt.from_user);
                setTo(debt.to_user);
                setAmount(String(debt.amount / 100));
              }}
              style={s.row}
            >
              <Text style={[s.meta, { flex: 1 }]}>
                {names[debt.from_user]} → {names[debt.to_user]}
              </Text>
              <Text style={s.amount}>{money(debt.amount, group.currency)}</Text>
            </Pressable>
          ))}
          <Field
            label="Amount"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
          />
          <Field
            label="Note"
            value={note}
            onChangeText={setNote}
            placeholder="Optional"
          />
          {error ? <ErrorNotice message={error} /> : null}
          <View style={styles.dialogActions}>
            <Button label="Cancel" secondary onPress={onClose} />
            <Button label="Save settlement" onPress={() => void save()} />
          </View>
        </Card>
      </View>
    </Modal>
  );
}
function MemberComposer({
  groupId,
  onClose,
  onSaved,
}: {
  groupId: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const save = async () => {
    try {
      await apiFetch(`/api/v1/groups/${groupId}/members`, {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      await onSaved();
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not add member.",
      );
    }
  };
  return (
    <Modal transparent visible onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Card>
          <Text style={s.sheetTitle}>Add member</Text>
          <Field
            label="Email address"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          {error ? <ErrorNotice message={error} /> : null}
          <View style={styles.dialogActions}>
            <Button label="Cancel" secondary onPress={onClose} />
            <Button label="Add member" onPress={() => void save()} />
          </View>
        </Card>
      </View>
    </Modal>
  );
}
const s = StyleSheet.create({
  iconButton: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  summary: { flexDirection: "row", gap: 10 },
  metricLabel: {
    fontSize: 8,
    letterSpacing: 1,
    color: colors.muted,
    fontWeight: "800",
  },
  metric: { color: colors.teal, fontSize: 17, fontWeight: "800", marginTop: 6 },
  tabs: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tab: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
  },
  tabActive: { backgroundColor: colors.teal, borderColor: colors.teal },
  tabText: { color: colors.ink, fontSize: 10, fontWeight: "800" },
  tabTextActive: { color: colors.white },
  actions: { gap: 10 },
  row: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    borderTopWidth: 1,
    borderColor: colors.line,
  },
  rowTitle: { color: colors.ink, fontSize: 12, fontWeight: "800" },
  meta: { color: colors.muted, fontSize: 10, marginTop: 2 },
  amount: { color: colors.teal, fontSize: 11, fontWeight: "800" },
  section: { color: colors.ink, fontFamily: "serif", fontSize: 22 },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sheetTitle: { color: colors.ink, fontFamily: "serif", fontSize: 25 },
  label: { color: colors.ink, fontSize: 11, fontWeight: "800" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  chipActive: { backgroundColor: colors.teal, borderColor: colors.teal },
  chipText: { color: colors.ink, fontSize: 10, fontWeight: "700" },
  chipTextActive: { color: colors.white },
  participant: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
  check: { padding: 4 },
});
