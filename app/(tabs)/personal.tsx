import AntDesign from "@expo/vector-icons/AntDesign";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Keyboard,
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
        <Loading label="Loading personal ledger…" />
      </Screen>
    );

  const currency = budget?.currency || expenses[0]?.currency || "NPR";
  return (
    <Screen>
      <PageTitle
        eyebrow="PERSONAL LEDGER"
        title="Personal"
        description="Private spending — separate from shared groups."
        action={
          <Pressable
            testID="personal-add"
            accessibilityRole="button"
            accessibilityLabel="Add personal expense"
            style={local.add}
            onPress={() => setEditor(null)}
            hitSlop={8}
          >
            <AntDesign name="plus" size={18} color={colors.white} />
          </Pressable>
        }
      />
      {error ? <ErrorNotice message={error} retry={() => void load()} /> : null}

      <View style={local.metrics}>
        <Card style={local.metric}>
          <Text style={local.metricLabel}>SPENT THIS MONTH</Text>
          <Text
            style={local.metricValue}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {money(stats?.total || 0, currency)}
          </Text>
          <Text style={local.metricHelp}>
            {expenses.length} expense{expenses.length === 1 ? "" : "s"} ·{" "}
            {month}
          </Text>
        </Card>
        <Card style={local.metric}>
          <Text style={local.metricLabel}>MONTHLY BUDGET</Text>
          <Text
            style={[local.metricValue, !budget && local.metricMuted]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {budget ? money(budget.amount, budget.currency) : "Not set"}
          </Text>
          <Text
            style={[local.percent, budgetPercent >= 90 && local.percentWarning]}
          >
            {budget ? `${budgetPercent}% used` : "Tap to set a budget"}
          </Text>
        </Card>
      </View>

      <Button
        label="Update budget"
        secondary
        icon="wallet"
        onPress={() => setBudgetOpen(true)}
      />

      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Button
            label="Export CSV"
            secondary
            icon="download"
            onPress={async () => {
              const { shareApiFile } = await import("../../src/files");
              await shareApiFile(
                "/api/v1/personal/export.csv",
                "settlr-personal.csv",
              );
            }}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label="Export JSON"
            secondary
            icon="download"
            onPress={async () => {
              const { shareApiFile } = await import("../../src/files");
              await shareApiFile(
                "/api/v1/personal/export.json",
                "settlr-personal.json",
              );
            }}
          />
        </View>
      </View>

      <Card>
        <View style={local.sectionHead}>
          <Text style={local.sectionTitle}>Recent expenses</Text>
          <Text style={local.sectionMeta}>{expenses.length} total</Text>
        </View>
        {expenses.map((expense) => (
          <View key={expense.id} style={local.row}>
            <Pressable
              style={local.rowMain}
              onPress={() => setEditor(expense)}
              accessibilityRole="button"
              accessibilityLabel={`${expense.description}, ${money(expense.amount, expense.currency)}`}
            >
              <Text
                style={local.rowTitle}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {expense.description}
              </Text>
              <Text style={local.meta} numberOfLines={1}>
                {expense.expense_date} ·{" "}
                {categories.find((c) => c.id === expense.category_id)?.name ||
                  "Uncategorized"}
              </Text>
            </Pressable>
            <Text style={local.amount} numberOfLines={1}>
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
                  hitSlop={10}
                  style={local.deleteBtn}
                >
                  <AntDesign name="delete" size={16} color={colors.coral} />
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
        <Text style={local.sectionHelp}>Group your personal spending.</Text>
        <CategoryCreator onSaved={load} />
        {categories.map((category) => (
          <View key={category.id} style={local.category}>
            <View
              style={[
                local.dot,
                { backgroundColor: category.color || colors.teal },
              ]}
            />
            <Text style={local.rowTitle} numberOfLines={1}>
              {category.name}
            </Text>
          </View>
        ))}
        {!categories.length ? (
          <Text style={local.meta}>No categories yet. Create one above.</Text>
        ) : null}
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
    if (busy) return;
    const cents = Math.round(Number(amount.replace(/,/g, "")) * 100);
    if (!description.trim()) {
      setError("Enter a description.");
      return;
    }
    if (!Number.isFinite(cents) || cents <= 0) {
      setError("Enter an amount greater than zero.");
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
    <Modal
      transparent
      visible
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1, width: "100%" }}
        >
          <ScrollView
            contentContainerStyle={{ padding: 16 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            <Card
              style={[
                local.sheet,
                { maxWidth: 560, width: "100%", alignSelf: "center" },
              ]}
            >
              <View style={local.sheetHead}>
                <Text style={local.sheetTitle}>
                  {expense ? "Edit personal expense" : "Add personal expense"}
                </Text>
                <Pressable
                  onPress={onClose}
                  hitSlop={10}
                  style={local.closeBtn}
                >
                  <AntDesign name="close" size={14} color={colors.ink} />
                </Pressable>
              </View>
              <Field
                label="Description *"
                testID="personal-description"
                value={description}
                onChangeText={(v) => {
                  setDescription(v);
                  if (error) setError("");
                }}
                placeholder="Groceries, coffee, transport…"
                maxLength={120}
              />
              <Field
                label="Amount *"
                testID="personal-amount"
                value={amount}
                onChangeText={(v) => {
                  setAmount(v.replace(/[^0-9.,]/g, ""));
                  if (error) setError("");
                }}
                keyboardType="decimal-pad"
                placeholder="0.00"
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
              />
              <View style={styles.dialogActions}>
                <Button
                  label="Cancel"
                  secondary
                  onPress={onClose}
                  disabled={busy}
                />
                <Button
                  testID="personal-submit"
                  label={busy ? "Saving…" : "Save expense"}
                  disabled={busy}
                  onPress={() => void save()}
                />
              </View>
              <Text style={local.optionalDetails}>Optional details</Text>
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
                <View style={{ gap: 8 }}>
                  <Text style={local.fieldLabel}>Category</Text>
                  <View style={local.chips}>
                    {categories.map((item) => {
                      const active = category === item.id;
                      return (
                        <Pressable
                          key={item.id}
                          onPress={() => setCategory(active ? "" : item.id)}
                          style={[local.chip, active && local.chipActive]}
                          accessibilityRole="button"
                          accessibilityState={{ selected: active }}
                        >
                          <Text
                            style={[
                              local.chipText,
                              active && local.chipTextActive,
                            ]}
                          >
                            {item.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : null}
              {error ? <ErrorNotice message={error} /> : null}
            </Card>
          </ScrollView>
        </KeyboardAvoidingView>
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
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (busy) return;
    const cents = Math.round(Number(amount.replace(/,/g, "")) * 100);
    if (!Number.isFinite(cents) || cents < 0) {
      setError("Enter a valid budget (0 or more).");
      return;
    }
    setBusy(true);
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
      <View style={styles.backdrop}>
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
            <View style={{ width: "100%", maxWidth: 420, alignSelf: "center" }}>
              <Card style={local.sheet}>
                <View style={local.sheetHead}>
                  <Text style={local.sheetTitle}>Monthly budget · {month}</Text>
                  <Pressable
                    onPress={onClose}
                    hitSlop={10}
                    style={local.closeBtn}
                  >
                    <AntDesign name="close" size={14} color={colors.ink} />
                  </Pressable>
                </View>
                <Field
                  label="Budget amount"
                  value={amount}
                  onChangeText={(v) => {
                    setAmount(v.replace(/[^0-9.,]/g, ""));
                    if (error) setError("");
                  }}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                />
                <Text style={local.help}>
                  Leave empty or 0 to remove the budget. You’ll see % used on
                  the overview.
                </Text>
                {error ? <ErrorNotice message={error} /> : null}
                <View style={styles.dialogActions}>
                  <Button
                    label="Cancel"
                    secondary
                    onPress={onClose}
                    disabled={busy}
                  />
                  <Button
                    label={busy ? "Saving…" : "Update budget"}
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

function CategoryCreator({ onSaved }: { onSaved: () => Promise<void> }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const create = async () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      await apiFetch("/api/v1/categories", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          icon: "tag",
          color: "#0B6B57",
        }),
      });
      setName("");
      await onSaved();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not create category.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={local.newCategory}>
      <View style={{ flex: 1 }}>
        <Field
          label="New category"
          value={name}
          onChangeText={(v) => {
            setName(v);
            if (error) setError("");
          }}
          placeholder="e.g. Transport"
          maxLength={30}
          onSubmitEditing={() => void create()}
          returnKeyType="done"
        />
        {error ? <Text style={local.errorSm}>{error}</Text> : null}
      </View>
      <View style={{ paddingBottom: 2 }}>
        <Button
          label={busy ? "…" : "Add"}
          secondary
          disabled={busy || !name.trim()}
          onPress={() => void create()}
        />
      </View>
    </View>
  );
}

const local = StyleSheet.create({
  add: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  metrics: { flexDirection: "row", gap: 10 },
  metric: { flex: 1, gap: 4 },
  metricLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    color: colors.muted,
    textTransform: "uppercase",
  },
  metricValue: {
    color: colors.teal,
    fontSize: 18,
    fontWeight: "800",
    marginTop: 4,
    lineHeight: 22,
  },
  metricMuted: { color: colors.muted, fontSize: 14 },
  metricHelp: {
    color: colors.muted,
    fontSize: 10,
    lineHeight: 13,
    marginTop: 2,
  },
  percent: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2,
    fontWeight: "600",
  },
  percentWarning: { color: colors.coral, fontWeight: "800" },
  sectionTitle: {
    color: colors.ink,
    fontFamily: "serif",
    fontSize: 18,
    lineHeight: 22,
  },
  sectionHelp: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 14,
    marginTop: 2,
  },
  sectionHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  sectionMeta: { color: colors.muted, fontSize: 11, fontWeight: "600" },
  row: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderColor: colors.line,
    minHeight: 56,
  },
  rowMain: { flex: 1, minWidth: 0, gap: 3 },
  rowTitle: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 16,
  },
  meta: { color: colors.muted, fontSize: 11, lineHeight: 14 },
  amount: {
    color: colors.teal,
    fontSize: 13,
    fontWeight: "800",
    flexShrink: 0,
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  category: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingVertical: 6,
  },
  dot: { width: 9, height: 9, borderRadius: 5 },
  sheet: { gap: 12 },
  sheetTitle: {
    color: colors.ink,
    fontFamily: "serif",
    fontSize: 20,
    lineHeight: 24,
  },
  sheetHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.sage,
    alignItems: "center",
    justifyContent: "center",
  },
  optionalDetails: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  fieldLabel: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 6,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.paper,
    minHeight: 36,
  },
  chipActive: { backgroundColor: colors.teal, borderColor: colors.teal },
  chipText: { color: colors.ink, fontSize: 11, fontWeight: "700" },
  chipTextActive: { color: colors.white },
  newCategory: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  help: { color: colors.muted, fontSize: 11, lineHeight: 14, marginTop: 4 },
  errorSm: { color: colors.coral, fontSize: 11, marginTop: 4 },
});
