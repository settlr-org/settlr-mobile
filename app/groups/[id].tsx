import AntDesign from "@expo/vector-icons/AntDesign";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { apiFetch } from "../../src/api";
import { useSession } from "../../src/session";
import { colors, shadow } from "../../src/theme";
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
  styles as uiStyles,
} from "../../src/ui";
import type {
  Debt,
  Expense,
  Friend,
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
  const [friends, setFriends] = useState<Friend[]>([]);
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
      const [g, m, f, e, b, d, s] = await Promise.all([
        apiFetch<Group>(`/api/v1/groups/${id}`),
        apiFetch<{ data: Member[] }>(`/api/v1/groups/${id}/members`),
        apiFetch<{ data: Friend[] }>("/api/v1/friends"),
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
      setFriends(f.data);
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
    () => Object.fromEntries(members.map((m) => [m.id, m.name])),
    [members],
  );

  if (loading)
    return (
      <Screen>
        <Loading label="Opening ledger…" />
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

  const visible = expenses.filter((e) =>
    e.description.toLowerCase().includes(filter.toLowerCase().trim()),
  );
  const myBalance =
    balances?.data.find((item) => item.user_id === user?.id)?.amount || 0;
  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <Screen>
      <PageTitle
        eyebrow="SHARED LEDGER"
        title={group.name}
        titleNumberOfLines={1}
        description={`${labelize(group.group_type || "GROUP")} · ${group.currency} · ${members.length} member${members.length === 1 ? "" : "s"}`}
        action={
          <Pressable
            testID="group-manage"
            style={s.iconButton}
            onPress={() => router.push(`/groups/${id}/manage`)}
            accessibilityRole="button"
            accessibilityLabel="Group settings"
            hitSlop={8}
          >
            <AntDesign name="setting" size={18} color={colors.ink} />
          </Pressable>
        }
      />

      {error ? <ErrorNotice message={error} retry={() => void load()} /> : null}

      <View style={s.summary}>
        <Card style={s.metricCard}>
          <Text style={s.metricLabel}>GROUP SPENDING</Text>
          <Text style={s.metric} numberOfLines={1} adjustsFontSizeToFit>
            {money(totalSpent, group.currency)}
          </Text>
          <Text style={s.metricHelp}>
            {expenses.length} expense{expenses.length === 1 ? "" : "s"}
          </Text>
        </Card>
        <Card style={[s.metricCard, myBalance < 0 && s.metricCardNegative]}>
          <Text style={s.metricLabel}>
            {myBalance > 0
              ? "YOU ARE OWED"
              : myBalance < 0
                ? "YOU OWE"
                : "YOU'RE SETTLED"}
          </Text>
          <Text
            style={[
              s.metric,
              myBalance < 0 && s.metricNegative,
              myBalance > 0 && s.metricPositive,
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {myBalance === 0 ? "—" : money(Math.abs(myBalance), group.currency)}
          </Text>
          <Text style={s.metricHelp} numberOfLines={1}>
            {myBalance > 0
              ? "Others owe you"
              : myBalance < 0
                ? "You owe others"
                : "No balance"}
          </Text>
        </Card>
      </View>

      <View style={s.tabs} accessibilityRole="tablist">
        {(["expenses", "balances", "members", "settlements"] as Tab[]).map(
          (item) => {
            const active = tab === item;
            return (
              <Pressable
                key={item}
                testID={`group-tab-${item}`}
                onPress={() => setTab(item)}
                style={[s.tab, active && s.tabActive]}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={labelize(item)}
                hitSlop={4}
              >
                <Text style={[s.tabText, active && s.tabTextActive]}>
                  {labelize(item)}
                </Text>
              </Pressable>
            );
          },
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
              placeholder="Filter by description"
              returnKeyType="search"
            />
          </View>

          {visible.map((expense) => (
            <View key={expense.id} style={s.row}>
              <Pressable
                style={s.rowMain}
                onPress={() => router.push(`/expenses/${expense.id}`)}
                accessibilityRole="button"
                accessibilityLabel={`${expense.description}, ${money(expense.amount, expense.currency)}, paid by ${names[expense.paid_by] || "unknown"}`}
              >
                <Text style={s.rowTitle} numberOfLines={1} ellipsizeMode="tail">
                  {expense.description}
                </Text>
                <Text style={s.meta} numberOfLines={1}>
                  {expense.expense_date} · paid by{" "}
                  {names[expense.paid_by] || "Unknown"} ·{" "}
                  {expense.split_mode === "EQUAL"
                    ? "Equal split"
                    : labelize(expense.split_mode)}
                </Text>
              </Pressable>
              <Text style={s.amount} numberOfLines={1}>
                {money(expense.amount, expense.currency)}
              </Text>
              <ConfirmAction
                title="Delete expense?"
                description={`“${expense.description}” will be permanently removed. This will recalculate balances.`}
                onConfirm={async () => {
                  await apiFetch(`/api/v1/expenses/${expense.id}`, {
                    method: "DELETE",
                  });
                  await load();
                }}
              >
                {(open) => (
                  <Pressable
                    onPress={open}
                    hitSlop={10}
                    style={s.deleteBtn}
                    accessibilityRole="button"
                    accessibilityLabel={`Delete ${expense.description}`}
                  >
                    <AntDesign name="delete" size={16} color={colors.coral} />
                  </Pressable>
                )}
              </ConfirmAction>
            </View>
          ))}

          {!visible.length ? (
            <Empty
              icon="wallet"
              title="No expenses yet"
              text={
                filter
                  ? "No matches for your search."
                  : "Add the first shared expense to see balances update."
              }
            />
          ) : null}
        </Card>
      ) : null}

      {tab === "balances" ? (
        <>
          <Card>
            <Text style={s.section}>Member balances</Text>
            <Text style={s.sectionHelp}>
              Positive means the group owes them. Negative means they owe the
              group.
            </Text>
            {balances?.data.map((b) => {
              const isYou = b.user_id === user?.id;
              const isNeg = b.amount < 0;
              const isPos = b.amount > 0;
              const display =
                b.amount === 0
                  ? "Settled up"
                  : b.amount > 0
                    ? `Is owed ${money(b.amount, balances.currency)}`
                    : `Owes ${money(Math.abs(b.amount), balances.currency)}`;
              return (
                <View style={s.row} key={b.user_id}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      style={[s.rowTitle, isYou && s.rowTitleYou]}
                      numberOfLines={1}
                    >
                      {names[b.user_id] || "Member"} {isYou ? "· You" : ""}
                    </Text>
                    <Text
                      style={[
                        s.meta,
                        isNeg && s.metaNegative,
                        isPos && s.metaPositive,
                      ]}
                      numberOfLines={1}
                    >
                      {display}
                    </Text>
                  </View>
                  <Text
                    style={[
                      s.amount,
                      isNeg && s.amountNeg,
                      isPos && s.amountPos,
                    ]}
                    numberOfLines={1}
                  >
                    {b.amount === 0 ? "—" : money(b.amount, balances.currency)}
                  </Text>
                </View>
              );
            })}
            {!balances?.data.length ? (
              <Text style={s.meta}>
                No balances yet. Add an expense to calculate.
              </Text>
            ) : null}
          </Card>

          <Card>
            <Text style={s.section}>Suggested repayments</Text>
            <Text style={s.sectionHelp}>
              Simplified debts to settle the group. Tap a row to pre-fill a
              settlement.
            </Text>
            {debts.map((debt, index) => {
              const isYouPay = debt.from_user === user?.id;
              const isYouReceive = debt.to_user === user?.id;
              const sentence = isYouPay
                ? `You pay ${names[debt.to_user] || "member"}`
                : isYouReceive
                  ? `${names[debt.from_user] || "Member"} pays you`
                  : `${names[debt.from_user] || "Member"} pays ${names[debt.to_user] || "member"}`;
              return (
                <View
                  key={`${debt.from_user}-${debt.to_user}-${index}`}
                  style={s.row}
                >
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      style={[
                        s.rowTitle,
                        (isYouPay || isYouReceive) && s.rowTitleYou,
                      ]}
                      numberOfLines={1}
                    >
                      {sentence}
                    </Text>
                    <Text style={s.meta} numberOfLines={1}>
                      {isYouPay
                        ? "You owe this amount"
                        : isYouReceive
                          ? "You are owed this amount"
                          : "Between members"}
                    </Text>
                  </View>
                  <Text style={s.amount} numberOfLines={1}>
                    {money(debt.amount, group.currency)}
                  </Text>
                </View>
              );
            })}
            {!debts.length ? (
              <Empty
                icon="checkcircleo"
                title="All settled"
                text="No repayments are needed. Everyone is even."
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
            <View>
              <Text style={s.section}>Members</Text>
              <Text style={s.sectionHelp}>{members.length} in this ledger</Text>
            </View>
            <Button
              label="Add member"
              secondary
              onPress={() => setMemberOpen(true)}
            />
          </View>
          {members.map((member) => (
            <View style={s.row} key={member.id}>
              <View style={s.avatarSm}>
                <Text style={s.avatarSmText}>
                  {(member.name || "?").slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.rowTitle} numberOfLines={1}>
                  {member.name} {member.id === user?.id ? "· You" : ""}
                </Text>
                <Text style={s.meta}>{labelize(member.role)}</Text>
              </View>
            </View>
          ))}
        </Card>
      ) : null}

      {tab === "settlements" ? (
        <Card>
          <View style={s.sectionHead}>
            <View>
              <Text style={s.section}>Settlement history</Text>
              <Text style={s.sectionHelp}>Payments that settled balances</Text>
            </View>
            <Button
              label="Settle up"
              secondary
              onPress={() => setSettlementOpen(true)}
            />
          </View>
          {settlements.map((settlement) => (
            <View style={s.row} key={settlement.id}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.rowTitle} numberOfLines={1}>
                  {names[settlement.from_user] || "Member"} paid{" "}
                  {names[settlement.to_user] || "member"}
                </Text>
                <Text style={s.meta} numberOfLines={1}>
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
              text="Record a payment when someone pays another member."
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
          friends={friends}
          members={members}
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
  const [payer, setPayer] = useState(userId || members[0]?.id || "");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [mode, setMode] = useState<"EQUAL" | "EXACT" | "PERCENTAGE" | "SHARES">(
    "EQUAL",
  );
  const [selected, setSelected] = useState(members.map((m) => m.id));
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const cents = Math.round(Number(amount.replace(/,/g, "")) * 100);

  useEffect(() => {
    if (selected.length < 2 && mode !== "EQUAL") {
      setMode("EQUAL");
      setValues({});
    }
  }, [selected.length, mode]);

  const save = async () => {
    if (busy) return;
    if (!description.trim()) {
      setError("Add a description.");
      return;
    }
    if (!Number.isFinite(cents) || cents <= 0) {
      setError("Enter an amount greater than 0.");
      return;
    }
    if (!selected.length) {
      setError("Select at least one participant.");
      return;
    }
    if (selected.length && !payer) {
      setError("Choose who paid.");
      return;
    }
    const splits: Split[] = selected.map((id) => {
      const raw = values[id] || "0";
      const v = Number(raw);
      return mode === "EXACT"
        ? { user_id: id, amount: Math.round(v * 100) }
        : mode === "PERCENTAGE"
          ? { user_id: id, percentage: v }
          : mode === "SHARES"
            ? { user_id: id, shares: v }
            : { user_id: id };
    });
    if (
      mode === "EXACT" &&
      splits.reduce((sum, s) => sum + (s.amount || 0), 0) !== cents
    ) {
      setError("Exact amounts must add up to the expense total.");
      return;
    }
    if (
      mode === "PERCENTAGE" &&
      Math.round(
        splits.reduce((sum, s) => sum + (s.percentage || 0), 0) * 100,
      ) /
        100 !==
        100
    ) {
      setError("Percentages must add up to 100%.");
      return;
    }
    if (mode === "SHARES" && splits.some((s) => (s.shares || 0) <= 0)) {
      setError("Give every selected person at least one share.");
      return;
    }
    setBusy(true);
    try {
      await apiFetch(`/api/v1/groups/${group.id}/expenses`, {
        method: "POST",
        headers: {
          "Idempotency-Key": `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        },
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
    <Modal
      transparent
      visible
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={uiStyles.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1, width: "100%" }}
        >
          <ScrollView
            contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            <Card style={{ maxWidth: 560, width: "100%", alignSelf: "center" }}>
              <View style={s.sheetHead}>
                <View>
                  <Text style={s.eyebrow}>NEW EXPENSE · {group.currency}</Text>
                  <Text style={s.sheetTitle}>Add shared expense</Text>
                </View>
                <Pressable onPress={onClose} hitSlop={10} style={s.closeBtnSm}>
                  <AntDesign name="close" size={16} color={colors.ink} />
                </Pressable>
              </View>

              <Field
                label="Description *"
                value={description}
                onChangeText={(v) => {
                  setDescription(v);
                  if (error) setError("");
                }}
                placeholder="Dinner, taxi, groceries…"
              />
              <Field
                label={`Amount (${group.currency}) *`}
                value={amount}
                onChangeText={(v) => {
                  setAmount(v.replace(/[^0-9.,]/g, ""));
                  if (error) setError("");
                }}
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
                label="Notes (optional)"
                value={notes}
                onChangeText={setNotes}
                multiline
                placeholder="Optional"
              />

              <Text style={s.label}>Paid by</Text>
              <View style={s.chips}>
                {members.map((m) => {
                  const active = payer === m.id;
                  return (
                    <Pressable
                      key={m.id}
                      onPress={() => setPayer(m.id)}
                      style={[s.chip, active && s.chipActive]}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: active }}
                    >
                      <Text
                        style={[s.chipText, active && s.chipTextActive]}
                        numberOfLines={1}
                      >
                        {m.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={s.label}>Split method</Text>
              <View style={s.chips}>
                {(["EQUAL", "EXACT", "PERCENTAGE", "SHARES"] as const).map(
                  (item) => {
                    const active = mode === item;
                    const disabled = selected.length < 2 && item !== "EQUAL";
                    return (
                      <Pressable
                        key={item}
                        onPress={() => !disabled && setMode(item)}
                        disabled={disabled}
                        style={[
                          s.chip,
                          active && s.chipActive,
                          disabled && {
                            opacity: 0.45,
                            backgroundColor: colors.sage,
                          },
                        ]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active, disabled }}
                      >
                        <Text
                          style={[
                            s.chipText,
                            active && s.chipTextActive,
                            disabled && { color: colors.muted },
                          ]}
                        >
                          {labelize(item)}
                        </Text>
                      </Pressable>
                    );
                  },
                )}
              </View>

              {selected.length < 2 ? (
                <Text style={s.help}>
                  Add at least one more participant to use Exact, % or Shares.
                </Text>
              ) : (
                <Text style={s.help}>
                  Select participants and, if needed, enter
                  amounts/percentages/shares.
                </Text>
              )}

              {members.map((member) => {
                const isSelected = selected.includes(member.id);
                return (
                  <View style={s.participant} key={member.id}>
                    <Pressable
                      onPress={() =>
                        setSelected(
                          isSelected
                            ? selected.filter((id) => id !== member.id)
                            : [...selected, member.id],
                        )
                      }
                      hitSlop={6}
                      style={s.checkHit}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: isSelected }}
                    >
                      <View
                        style={[s.checkBox, isSelected && s.checkBoxActive]}
                      >
                        {isSelected ? (
                          <AntDesign
                            name="check"
                            size={12}
                            color={colors.white}
                          />
                        ) : null}
                      </View>
                    </Pressable>
                    <Text style={[s.rowTitle, { flex: 1 }]} numberOfLines={1}>
                      {member.name}
                    </Text>
                    {mode !== "EQUAL" ? (
                      <View style={{ flex: 1, maxWidth: 140 }}>
                        <Field
                          label={
                            mode === "EXACT"
                              ? "Amount"
                              : mode === "PERCENTAGE"
                                ? "%"
                                : "Shares"
                          }
                          value={values[member.id] || ""}
                          onChangeText={(v) =>
                            setValues({
                              ...values,
                              [member.id]: v.replace(/[^0-9.,]/g, ""),
                            })
                          }
                          keyboardType="decimal-pad"
                          placeholder={mode === "EXACT" ? "0.00" : "0"}
                          editable={isSelected}
                        />
                      </View>
                    ) : (
                      <AntDesign
                        name={isSelected ? "check-circle" : "minus-circle"}
                        size={14}
                        color={isSelected ? colors.teal : colors.muted}
                      />
                    )}
                  </View>
                );
              })}

              {error ? <ErrorNotice message={error} /> : null}
              <View style={uiStyles.dialogActions}>
                <Button
                  label="Cancel"
                  secondary
                  onPress={onClose}
                  disabled={busy}
                />
                <Button
                  label={busy ? "Saving…" : "Save expense"}
                  disabled={busy}
                  onPress={() => void save()}
                />
              </View>
            </Card>
          </ScrollView>
        </KeyboardAvoidingView>
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
  const [busy, setBusy] = useState(false);

  const cents = Math.round(Number(amount.replace(/,/g, "")) * 100);

  const save = async () => {
    if (busy) return;
    if (!from || !to || !cents || cents <= 0) {
      setError("Choose payer, recipient, and an amount greater than 0.");
      return;
    }
    if (from === to) {
      setError("Payer and recipient must be different.");
      return;
    }
    setBusy(true);
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
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      transparent
      visible
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={uiStyles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <KeyboardAvoidingView
          style={{ flex: 1, width: "100%" }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: "center",
              padding: 16,
            }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            <View style={{ width: "100%", maxWidth: 520, alignSelf: "center" }}>
              <Card>
                <View style={s.sheetHead}>
                  <Text style={s.sheetTitle}>Record settlement</Text>
                  <Pressable
                    onPress={onClose}
                    hitSlop={10}
                    style={s.closeBtnSm}
                  >
                    <AntDesign name="close" size={16} color={colors.ink} />
                  </Pressable>
                </View>
                {from && to ? (
                  <View style={s.settlementSummary}>
                    <Text style={s.settlementCopy} numberOfLines={1}>
                      {names[from] || "Member"} paying {names[to] || "member"}
                    </Text>
                    <Text
                      style={s.settlementAmount}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      {Number.isFinite(cents) && cents > 0
                        ? money(cents, group.currency)
                        : "—"}
                    </Text>
                    <Text style={s.help}>
                      This will reduce the outstanding balance. You can adjust
                      the amount.
                    </Text>
                  </View>
                ) : null}

                {debts.length ? (
                  <View style={{ gap: 6 }}>
                    <Text style={s.label}>Suggested debts — tap to fill</Text>
                    {debts.slice(0, 6).map((debt, idx) => {
                      const selected =
                        from === debt.from_user && to === debt.to_user;
                      return (
                        <Pressable
                          key={idx}
                          onPress={() => {
                            setFrom(debt.from_user);
                            setTo(debt.to_user);
                            setAmount(String(debt.amount / 100));
                            setError("");
                          }}
                          style={[s.debtRow, selected && s.debtRowActive]}
                          accessibilityRole="button"
                        >
                          <Text style={[s.meta, { flex: 1 }]} numberOfLines={1}>
                            {names[debt.from_user]} → {names[debt.to_user]}
                          </Text>
                          <Text style={s.amount}>
                            {money(debt.amount, group.currency)}
                          </Text>
                          {selected ? (
                            <AntDesign
                              name="check"
                              size={12}
                              color={colors.teal}
                            />
                          ) : null}
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}

                <Field
                  label="Amount *"
                  value={amount}
                  onChangeText={(v) => {
                    setAmount(v.replace(/[^0-9.,]/g, ""));
                    if (error) setError("");
                  }}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                />
                <Field
                  label="Note (optional)"
                  value={note}
                  onChangeText={setNote}
                  placeholder="Cash, transfer, etc."
                />

                {error ? <ErrorNotice message={error} /> : null}
                <View style={uiStyles.dialogActions}>
                  <Button
                    label="Cancel"
                    secondary
                    onPress={onClose}
                    disabled={busy}
                  />
                  <Button
                    label={busy ? "Saving…" : "Save settlement"}
                    disabled={busy}
                    onPress={() => void save()}
                  />
                </View>
              </Card>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function MemberComposer({
  groupId,
  friends,
  members,
  onClose,
  onSaved,
}: {
  groupId: string;
  friends: Friend[];
  members: Member[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const availableFriends = friends.filter(
    (f) => !members.some((m) => m.id === f.user_id),
  );
  const [friendID, setFriendID] = useState(availableFriends[0]?.user_id || "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!friendID || busy) return;
    setBusy(true);
    try {
      await apiFetch(`/api/v1/groups/${groupId}/members`, {
        method: "POST",
        body: JSON.stringify({ user_id: friendID }),
      });
      await onSaved();
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not add member.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      transparent
      visible
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={uiStyles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={{ width: "100%", maxWidth: 480, alignSelf: "center" }}>
          <Card>
            <View style={s.sheetHead}>
              <Text style={s.sheetTitle}>Add member</Text>
              <Pressable onPress={onClose} hitSlop={10} style={s.closeBtnSm}>
                <AntDesign name="close" size={16} color={colors.ink} />
              </Pressable>
            </View>
            <Text style={s.help}>
              Choose an accepted friend to add to this ledger. Only friends can
              be added directly.
            </Text>
            <View style={s.chips}>
              {availableFriends.map((friend) => {
                const active = friendID === friend.user_id;
                return (
                  <Pressable
                    key={friend.user_id}
                    onPress={() => setFriendID(friend.user_id)}
                    style={[s.chip, active && s.chipActive]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={[s.chipText, active && s.chipTextActive]}>
                      {friend.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {!availableFriends.length ? (
              <Text style={s.meta}>
                All of your friends are already members. Add a new friend from
                More → Friends.
              </Text>
            ) : null}
            {error ? <ErrorNotice message={error} /> : null}
            <View style={uiStyles.dialogActions}>
              <Button
                label="Cancel"
                secondary
                onPress={onClose}
                disabled={busy}
              />
              <Button
                label={busy ? "Adding…" : "Add member"}
                disabled={!friendID || busy}
                onPress={() => void save()}
              />
            </View>
          </Card>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  summary: { flexDirection: "row", gap: 10 },
  metricCard: { flex: 1, gap: 4 },
  metricCardNegative: { borderColor: colors.dangerBorder },
  metricLabel: {
    fontSize: 10,
    letterSpacing: 1,
    color: colors.muted,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  metric: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "800",
    marginTop: 4,
    lineHeight: 22,
  },
  metricPositive: { color: colors.teal },
  metricNegative: { color: colors.coral },
  metricHelp: {
    color: colors.muted,
    fontSize: 10,
    lineHeight: 13,
    marginTop: 2,
  },
  tabs: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tab: {
    minHeight: 36,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    alignItems: "center",
    justifyContent: "center",
  },
  tabActive: { backgroundColor: colors.teal, borderColor: colors.teal },
  tabText: { color: colors.ink, fontSize: 11, fontWeight: "700" },
  tabTextActive: { color: colors.white },
  actions: { gap: 10 },
  row: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingVertical: 6,
  },
  rowMain: { flex: 1, minWidth: 0, gap: 3 },
  rowTitle: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 16,
  },
  rowTitleYou: { color: colors.ink, fontWeight: "800" },
  meta: { color: colors.muted, fontSize: 11, lineHeight: 14 },
  metaNegative: { color: colors.coral, fontWeight: "600" },
  metaPositive: { color: colors.teal, fontWeight: "600" },
  amount: { color: colors.ink, fontSize: 13, fontWeight: "800", flexShrink: 0 },
  amountNeg: { color: colors.coral },
  amountPos: { color: colors.teal },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  section: {
    color: colors.ink,
    fontFamily: "serif",
    fontSize: 18,
    lineHeight: 22,
  },
  sectionHelp: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 14,
    marginBottom: 6,
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  sheetTitle: {
    color: colors.ink,
    fontFamily: "serif",
    fontSize: 20,
    lineHeight: 24,
  },
  sheetHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  closeBtnSm: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.sage,
    alignItems: "center",
    justifyContent: "center",
  },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 1.4,
    color: colors.teal,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  label: { color: colors.ink, fontSize: 11, fontWeight: "700", marginTop: 4 },
  help: { color: colors.muted, fontSize: 11, lineHeight: 14 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 },
  chip: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: colors.paper,
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  chipActive: { backgroundColor: colors.teal, borderColor: colors.teal },
  chipText: { color: colors.ink, fontSize: 11, fontWeight: "700" },
  chipTextActive: { color: colors.white },
  participant: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
    minHeight: 56,
  },
  checkHit: { padding: 4 },
  checkBox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.paper,
  },
  checkBoxActive: { backgroundColor: colors.teal, borderColor: colors.teal },
  avatarSm: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.sage,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarSmText: { fontSize: 11, fontWeight: "800", color: colors.teal },
  settlementSummary: {
    backgroundColor: colors.sage,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  settlementCopy: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
  },
  settlementAmount: {
    color: colors.teal,
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 24,
  },
  debtRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    backgroundColor: colors.paper,
  },
  debtRowActive: { borderColor: colors.teal, backgroundColor: colors.sage },
});
