import AntDesign from "@expo/vector-icons/AntDesign";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { apiFetch } from "../../src/api";
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
import type { Category, PersonalExpense } from "../../src/types";
import { money } from "../../src/types";

type Stats = {
  total: number;
  by_category:
    Record<string, number> | { category_id: string; total: number }[];
};
type Budget = { month: string; amount: number; currency: string };
const today = () => new Date().toISOString().slice(0, 10);

export default function Personal() {
  const params = useLocalSearchParams<{ new?: string }>();
  const month = today().slice(0, 7);
  const [expenses, setExpenses] = useState<PersonalExpense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState<Stats>();
  const [budget, setBudget] = useState<Budget>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editor, setEditor] = useState<PersonalExpense | null | undefined>();
  const [budgetOpen, setBudgetOpen] = useState(false);
  useEffect(() => {
    if (params.new === "1") setEditor(null);
  }, [params.new]);
  const load = useCallback(async () => {
    try {
      const [e, c, s, b] = await Promise.all([
        apiFetch<{ data: PersonalExpense[] }>("/api/v1/personal/expenses"),
        apiFetch<{ data: Category[] }>("/api/v1/categories"),
        apiFetch<Stats>("/api/v1/personal/stats"),
        apiFetch<Budget>(`/api/v1/personal/budget?month=${month}`),
      ]);
      setExpenses(e.data);
      setCategories(c.data);
      setStats(s);
      setBudget(b);
      setError("");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to load personal spending.",
      );
    } finally {
      setLoading(false);
    }
  }, [month]);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );
  const budgetPercent = useMemo(
    () =>
      budget?.amount
        ? Math.min(100, Math.round(((stats?.total || 0) / budget.amount) * 100))
        : 0,
    [budget, stats],
  );
  if (loading)
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  return (
    <Screen>
      <PageTitle
        eyebrow="PERSONAL LEDGER"
        title="Personal"
        description="Track spending that belongs only to you."
        action={
          <Pressable
            testID="personal-add"
            accessibilityLabel="Add personal expense"
            style={local.add}
            onPress={() => setEditor(null)}
          >
            <AntDesign name="plus" size={20} color={colors.white} />
          </Pressable>
        }
      />
      {error ? <ErrorNotice message={error} retry={() => void load()} /> : null}
      <View style={local.metrics}>
        <Card style={local.metric}>
          <Text style={local.metricLabel}>SPENT THIS MONTH</Text>
          <Text style={local.metricValue}>
            {money(
              stats?.total || 0,
              budget?.currency || expenses[0]?.currency || "NPR",
            )}
          </Text>
        </Card>
        <Card style={local.metric}>
          <Text style={local.metricLabel}>MONTHLY BUDGET</Text>
          <Text style={local.metricValue}>
            {budget ? money(budget.amount, budget.currency) : "Not set"}
          </Text>
          <Text style={local.percent}>
            {budget ? `${budgetPercent}% used` : "Add one below"}
          </Text>
        </Card>
      </View>
      <Button
        label="Update budget"
        secondary
        icon="wallet"
        onPress={() => setBudgetOpen(true)}
      />
      <Card>
        <Text style={local.sectionTitle}>Recent expenses</Text>
        {expenses.map((expense) => (
          <View key={expense.id} style={local.row}>
            <Pressable style={{ flex: 1 }} onPress={() => setEditor(expense)}>
              <Text style={local.rowTitle}>{expense.description}</Text>
              <Text style={local.meta}>
                {expense.expense_date} ·{" "}
                {categories.find(
                  (category) => category.id === expense.category_id,
                )?.name || "Uncategorized"}
              </Text>
            </Pressable>
            <Text style={local.amount}>
              {money(expense.amount, expense.currency)}
            </Text>
            <ConfirmAction
              title="Delete personal expense?"
              description={`“${expense.description}” will be permanently removed.`}
              onConfirm={async () => {
                await apiFetch(`/api/v1/personal/expenses/${expense.id}`, {
                  method: "DELETE",
                });
                await load();
              }}
            >
              {(open) => (
                <Pressable
                  accessibilityLabel={`Delete ${expense.description}`}
                  onPress={open}
                >
                  <AntDesign name="delete" size={18} color={colors.coral} />
                </Pressable>
              )}
            </ConfirmAction>
          </View>
        ))}
        {!expenses.length ? (
          <Empty
            icon="wallet"
            title="No personal expenses"
            text="Add your first expense to start tracking your month."
          />
        ) : null}
      </Card>
      <Card>
        <Text style={local.sectionTitle}>Categories</Text>
        <CategoryCreator onSaved={load} />
        {categories.map((category) => (
          <View key={category.id} style={local.category}>
            <View
              style={[
                local.dot,
                { backgroundColor: category.color || colors.teal },
              ]}
            />
            <Text style={local.rowTitle}>{category.name}</Text>
          </View>
        ))}
      </Card>
      {editor !== undefined ? (
        <ExpenseEditor
          expense={editor}
          categories={categories}
          onClose={() => setEditor(undefined)}
          onSaved={load}
        />
      ) : null}
      {budgetOpen ? (
        <BudgetEditor
          budget={budget}
          month={month}
          onClose={() => setBudgetOpen(false)}
          onSaved={load}
        />
      ) : null}
    </Screen>
  );
}

function ExpenseEditor({
  expense,
  categories,
  onClose,
  onSaved,
}: {
  expense: PersonalExpense | null;
  categories: Category[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [description, setDescription] = useState(expense?.description || "");
  const [amount, setAmount] = useState(
    expense ? String(expense.amount / 100) : "",
  );
  const [date, setDate] = useState(expense?.expense_date || today());
  const [notes, setNotes] = useState(expense?.notes || "");
  const [category, setCategory] = useState(expense?.category_id || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const save = async () => {
    const cents = Math.round(Number(amount) * 100);
    if (!description.trim() || !Number.isFinite(cents) || cents <= 0) {
      setError("Enter a description and amount greater than zero.");
      return;
    }
    setBusy(true);
    try {
      await apiFetch(
        expense
          ? `/api/v1/personal/expenses/${expense.id}`
          : "/api/v1/personal/expenses",
        {
          method: expense ? "PATCH" : "POST",
          body: JSON.stringify({
            description: description.trim(),
            amount: cents,
            currency: expense?.currency || "NPR",
            category_id: category || undefined,
            expense_date: date,
            notes,
          }),
        },
      );
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
        <Card style={local.sheet}>
          <Text style={local.sheetTitle}>
            {expense ? "Edit personal expense" : "Add personal expense"}
          </Text>
          <Field
            label="Description"
            testID="personal-description"
            value={description}
            onChangeText={setDescription}
            placeholder="Groceries, coffee, transport…"
          />
          <Field
            label="Amount"
            testID="personal-amount"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
          />
          <Field
            label="Date"
            testID="personal-date"
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
          />
          <Field
            label="Notes"
            testID="personal-notes"
            value={notes}
            onChangeText={setNotes}
            multiline
            placeholder="Optional note"
          />
          {categories.length ? (
            <View>
              <Text style={local.fieldLabel}>Category</Text>
              <View style={local.chips}>
                {categories.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() =>
                      setCategory(category === item.id ? "" : item.id)
                    }
                    style={[
                      local.chip,
                      category === item.id && local.chipActive,
                    ]}
                  >
                    <Text
                      style={[
                        local.chipText,
                        category === item.id && local.chipTextActive,
                      ]}
                    >
                      {item.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}
          {error ? <ErrorNotice message={error} /> : null}
          <View style={styles.dialogActions}>
            <Button label="Cancel" secondary onPress={onClose} />
            <Button
              testID="personal-submit"
              label={busy ? "Saving…" : "Save expense"}
              disabled={busy}
              onPress={() => void save()}
            />
          </View>
        </Card>
      </View>
    </Modal>
  );
}

function BudgetEditor({
  budget,
  month,
  onClose,
  onSaved,
}: {
  budget?: Budget;
  month: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [amount, setAmount] = useState(
    budget ? String(budget.amount / 100) : "",
  );
  const [error, setError] = useState("");
  const save = async () => {
    const cents = Math.round(Number(amount) * 100);
    if (!Number.isFinite(cents) || cents < 0) {
      setError("Enter a valid budget.");
      return;
    }
    try {
      await apiFetch(`/api/v1/personal/budget?month=${month}`, {
        method: "PUT",
        body: JSON.stringify({
          month,
          amount: cents,
          currency: budget?.currency || "NPR",
        }),
      });
      await onSaved();
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not update budget.",
      );
    }
  };
  return (
    <Modal transparent visible animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Card style={local.sheet}>
          <Text style={local.sheetTitle}>Monthly budget</Text>
          <Field
            label="Budget amount"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
          />
          {error ? <ErrorNotice message={error} /> : null}
          <View style={styles.dialogActions}>
            <Button label="Cancel" secondary onPress={onClose} />
            <Button label="Update budget" onPress={() => void save()} />
          </View>
        </Card>
      </View>
    </Modal>
  );
}

function CategoryCreator({ onSaved }: { onSaved: () => Promise<void> }) {
  const [name, setName] = useState("");
  const create = async () => {
    if (!name.trim()) return;
    await apiFetch("/api/v1/categories", {
      method: "POST",
      body: JSON.stringify({
        name: name.trim(),
        icon: "tag",
        color: "#176b54",
      }),
    });
    setName("");
    await onSaved();
  };
  return (
    <View style={local.newCategory}>
      <View style={{ flex: 1 }}>
        <Field
          label="New category"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Transport"
        />
      </View>
      <Button label="Add" secondary onPress={() => void create()} />
    </View>
  );
}

const local = StyleSheet.create({
  add: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  metrics: { flexDirection: "row", gap: 10 },
  metric: { flex: 1 },
  metricLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
    color: colors.muted,
  },
  metricValue: {
    color: colors.teal,
    fontSize: 19,
    fontWeight: "800",
    marginTop: 7,
  },
  percent: { color: colors.muted, fontSize: 10 },
  sectionTitle: { color: colors.ink, fontFamily: "serif", fontSize: 22 },
  row: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderColor: colors.line,
  },
  rowTitle: { color: colors.ink, fontSize: 13, fontWeight: "800" },
  meta: { color: colors.muted, fontSize: 10, marginTop: 3 },
  amount: { color: colors.teal, fontSize: 12, fontWeight: "800" },
  category: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingVertical: 5,
  },
  dot: { width: 9, height: 9, borderRadius: 5 },
  sheet: { maxHeight: "90%" },
  sheetTitle: { color: colors.ink, fontFamily: "serif", fontSize: 25 },
  fieldLabel: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 6,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
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
  newCategory: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
});
