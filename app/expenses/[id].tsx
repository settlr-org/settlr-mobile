import AntDesign from "@expo/vector-icons/AntDesign";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
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
import { apiFetch, apiUpload } from "../../src/api";
import { pickAttachment, shareApiFile } from "../../src/files";
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
  styles as uiStyles,
} from "../../src/ui";
import type {
  Attachment,
  Category,
  Comment,
  Expense,
  Group,
  Member,
} from "../../src/types";
import { money } from "../../src/types";

export default function ExpenseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [expense, setExpense] = useState<Expense>();
  const [group, setGroup] = useState<Group>();
  const [members, setMembers] = useState<Member[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    try {
      const e = await apiFetch<Expense>(`/api/v1/expenses/${id}`);
      const [g, m, c, cm, a] = await Promise.all([
        apiFetch<Group>(`/api/v1/groups/${e.group_id}`),
        apiFetch<{ data: Member[] }>(`/api/v1/groups/${e.group_id}/members`),
        apiFetch<{ data: Category[] }>("/api/v1/categories"),
        apiFetch<{ data: Comment[] }>(`/api/v1/expenses/${id}/comments`),
        apiFetch<{ data: Attachment[] }>(`/api/v1/expenses/${id}/attachments`),
      ]);
      setExpense(e);
      setGroup(g);
      setMembers(m.data);
      setCategories(c.data);
      setComments(cm.data);
      setAttachments(a.data);
      setError("");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not load expense.",
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

  if (loading)
    return (
      <Screen>
        <Loading label="Loading expense…" />
      </Screen>
    );
  if (!expense || !group)
    return (
      <Screen>
        <ErrorNotice
          message={error || "Expense not found."}
          retry={() => void load()}
        />
      </Screen>
    );

  const paidByName =
    members.find((m) => m.id === expense.paid_by)?.name || "a group member";
  const categoryName = categories.find(
    (c) => c.id === expense.category_id,
  )?.name;

  return (
    <Screen>
      <PageTitle
        eyebrow={group.name}
        title={expense.description}
        description={`${new Date(
          `${expense.expense_date}T00:00:00`,
        ).toLocaleDateString("en-NP", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })} · ${expense.split_mode === "EQUAL" ? "Equal split" : expense.split_mode} · ${expense.currency}`}
        action={
          <Pressable
            style={s.icon}
            onPress={() => setEditing(true)}
            accessibilityRole="button"
            accessibilityLabel="Edit expense"
            hitSlop={8}
          >
            <AntDesign name="edit" size={16} color={colors.teal} />
          </Pressable>
        }
      />

      {error ? <ErrorNotice message={error} retry={() => void load()} /> : null}

      <Card style={s.summary}>
        <Text style={s.summaryLabel}>TOTAL EXPENSE</Text>
        <Text style={s.summaryAmount} numberOfLines={1} adjustsFontSizeToFit>
          {money(expense.amount, expense.currency)}
        </Text>
        <Text style={s.summaryMeta} numberOfLines={1}>
          Paid by {paidByName} {categoryName ? `· ${categoryName}` : ""}
        </Text>
        <Text style={s.summaryHelp}>
          Split details explain each person’s share.
        </Text>
      </Card>

      <Card>
        <Text style={s.section}>How it was split</Text>
        <Text style={s.sectionHelp}>
          Everyone’s portion is shown with the method used.
        </Text>
        {expense.splits?.map((split) => {
          const name =
            members.find((m) => m.id === split.user_id)?.name || "Member";
          const detail =
            expense.split_mode === "EXACT" && split.amount !== undefined
              ? money(split.amount, expense.currency)
              : expense.split_mode === "PERCENTAGE" &&
                  split.percentage !== undefined
                ? `${split.percentage}%`
                : expense.split_mode === "SHARES" && split.shares !== undefined
                  ? `${split.shares} share${split.shares === 1 ? "" : "s"}`
                  : `${money(Math.round(expense.amount / Math.max(expense.splits?.length || 1, 1)), expense.currency)} each`;
          return (
            <View key={split.user_id} style={s.row}>
              <View style={s.avatarTiny}>
                <Text style={s.avatarTinyText}>
                  {name.slice(0, 1).toUpperCase()}
                </Text>
              </View>
              <Text style={[s.item, { flex: 1 }]} numberOfLines={1}>
                {name}
              </Text>
              <Text style={s.meta} numberOfLines={1}>
                {detail}
              </Text>
            </View>
          );
        })}
        {!expense.splits?.length ? (
          <Text style={s.note}>No split details.</Text>
        ) : null}
        <View style={s.noteBox}>
          <Text style={s.noteLabel}>Notes</Text>
          <Text style={s.note}>
            {expense.notes?.trim() || "No notes added."}
          </Text>
        </View>
      </Card>

      <Comments expenseId={id} comments={comments} onSaved={load} />
      <Attachments expenseId={id} attachments={attachments} onSaved={load} />

      <ConfirmAction
        title="Delete expense?"
        description={`“${expense.description}” will be permanently removed and balances will be recalculated.`}
        onConfirm={async () => {
          await apiFetch(`/api/v1/expenses/${id}`, { method: "DELETE" });
          router.replace(`/groups/${group.id}`);
        }}
      >
        {(open) => <Button label="Delete expense" danger onPress={open} />}
      </ConfirmAction>

      {editing ? (
        <Editor
          expense={expense}
          categories={categories}
          members={members}
          onClose={() => setEditing(false)}
          onSaved={load}
        />
      ) : null}
    </Screen>
  );
}

function Editor({
  expense,
  categories,
  members,
  onClose,
  onSaved,
}: {
  expense: Expense;
  categories: Category[];
  members: Member[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [description, setDescription] = useState(expense.description);
  const [amount, setAmount] = useState(String(expense.amount / 100));
  const [paidBy, setPaidBy] = useState(expense.paid_by);
  const [date, setDate] = useState(expense.expense_date);
  const [notes, setNotes] = useState(expense.notes || "");
  const [category, setCategory] = useState(expense.category_id || "");
  const [splitValues, setSplitValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const split of expense.splits || []) {
      if (expense.split_mode === "EXACT" && split.amount !== undefined)
        init[split.user_id] = String(split.amount / 100);
      else if (
        expense.split_mode === "PERCENTAGE" &&
        split.percentage !== undefined
      )
        init[split.user_id] = String(split.percentage);
      else if (expense.split_mode === "SHARES" && split.shares !== undefined)
        init[split.user_id] = String(split.shares);
    }
    return init;
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (busy) return;
    if (!description.trim()) {
      setError("Description is required.");
      return;
    }
    const cents = Math.round(Number(amount.replace(/,/g, "")) * 100);
    if (!Number.isFinite(cents) || cents <= 0) {
      setError("Enter an amount greater than 0.");
      return;
    }
    setBusy(true);
    try {
      const splits = (expense.splits || []).map((split) => {
        const base = { user_id: split.user_id };
        const v = Number((splitValues[split.user_id] || "").replace(/,/g, ""));
        if (expense.split_mode === "EXACT" && Number.isFinite(v))
          return { ...base, amount: Math.round(v * 100) };
        if (expense.split_mode === "PERCENTAGE" && Number.isFinite(v))
          return { ...base, percentage: v };
        if (expense.split_mode === "SHARES" && Number.isFinite(v))
          return { ...base, shares: v };
        return base;
      });
      await apiFetch(`/api/v1/expenses/${expense.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          description: description.trim(),
          amount: cents,
          currency: expense.currency,
          paid_by: paidBy,
          expense_date: date,
          notes,
          category_id: category || null,
          split_mode: expense.split_mode,
          splits,
        }),
      });
      await onSaved();
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not update expense.",
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
            contentContainerStyle={{ padding: 16 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Card style={{ maxWidth: 560, width: "100%", alignSelf: "center" }}>
              <View style={s.sheetHead}>
                <View>
                  <Text style={s.eyebrow}>
                    {expense.split_mode} split · {expense.currency}
                  </Text>
                  <Text style={s.dialog}>Edit expense</Text>
                </View>
                <Pressable onPress={onClose} hitSlop={10} style={s.closeBtn}>
                  <AntDesign name="close" size={14} color={colors.ink} />
                </Pressable>
              </View>

              <Field
                label="Description *"
                value={description}
                onChangeText={setDescription}
                placeholder="Description"
              />
              <Field
                label="Amount *"
                value={amount}
                onChangeText={(v) => setAmount(v.replace(/[^0-9.,]/g, ""))}
                keyboardType="decimal-pad"
                placeholder="0.00"
              />
              <Text style={s.labelSmall}>Paid by</Text>
              <View style={s.chipsWrap}>
                {members.map((m) => {
                  const active = paidBy === m.id;
                  return (
                    <Pressable
                      key={m.id}
                      onPress={() => setPaidBy(m.id)}
                      style={[s.chip, active && s.chipActive]}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: active }}
                    >
                      <Text style={[s.chipText, active && s.chipTextActive]}>
                        {m.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Field
                label="Date"
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
              />
              {expense.split_mode !== "EQUAL" &&
                (expense.splits || []).map((split) => (
                  <Field
                    key={split.user_id}
                    label={`${expense.split_mode.toLowerCase()} for ${members.find((m) => m.id === split.user_id)?.name || split.user_id}`}
                    value={splitValues[split.user_id] || ""}
                    onChangeText={(v) =>
                      setSplitValues({
                        ...splitValues,
                        [split.user_id]: v.replace(/[^0-9.,]/g, ""),
                      })
                    }
                    keyboardType="decimal-pad"
                    placeholder={
                      expense.split_mode === "EXACT"
                        ? expense.currency
                        : expense.split_mode === "PERCENTAGE"
                          ? "%"
                          : "shares"
                    }
                  />
                ))}
              <Field
                label="Notes"
                value={notes}
                onChangeText={setNotes}
                multiline
                placeholder="Optional"
              />
              {categories.length ? (
                <View style={{ gap: 8, marginTop: 8 }}>
                  <Text style={s.labelSmall}>Category</Text>
                  {categories.map((item) => {
                    const active = category === item.id;
                    return (
                      <Pressable
                        key={item.id}
                        style={[s.categoryRow, active && s.categoryRowActive]}
                        onPress={() => setCategory(active ? "" : item.id)}
                      >
                        <View
                          style={[
                            s.categoryCheck,
                            active && s.categoryCheckActive,
                          ]}
                        >
                          {active ? (
                            <AntDesign
                              name="check"
                              size={10}
                              color={colors.white}
                            />
                          ) : null}
                        </View>
                        <Text style={[s.item, active && s.itemActive]}>
                          {item.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
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
                  label={busy ? "Saving…" : "Save changes"}
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

function Comments({
  expenseId,
  comments,
  onSaved,
}: {
  expenseId: string;
  comments: Comment[];
  onSaved: () => Promise<void>;
}) {
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const add = async () => {
    if (!body.trim() || busy) return;
    setBusy(true);
    try {
      await apiFetch(`/api/v1/expenses/${expenseId}/comments`, {
        method: "POST",
        body: JSON.stringify({ body: body.trim() }),
      });
      setBody("");
      setError("");
      await onSaved();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not add comment.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card>
      <Text style={s.section}>Comments</Text>
      <Text style={s.sectionHelp}>
        {comments.length} comment{comments.length === 1 ? "" : "s"}
      </Text>
      {comments.map((c) => (
        <View style={s.row} key={c.id}>
          <View style={s.avatarTiny}>
            <Text style={s.avatarTinyText}>
              {c.name.slice(0, 1).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.item} numberOfLines={1}>
              {c.name}
            </Text>
            <Text style={s.note} numberOfLines={4}>
              {c.body}
            </Text>
            <Text style={s.metaSmall}>
              {new Date(c.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>
      ))}
      {!comments.length ? (
        <Text style={s.note}>
          No comments yet. Add context for this expense.
        </Text>
      ) : null}
      <Field
        label="Add a comment"
        value={body}
        onChangeText={setBody}
        placeholder="Write a comment…"
        multiline
      />
      <Button
        label={busy ? "Posting…" : "Post comment"}
        secondary
        disabled={busy || !body.trim()}
        onPress={() => void add()}
      />
      {error ? <ErrorNotice message={error} /> : null}
    </Card>
  );
}

function Attachments({
  expenseId,
  attachments,
  onSaved,
}: {
  expenseId: string;
  attachments: Attachment[];
  onSaved: () => Promise<void>;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"photo" | "document" | null>(null);
  const upload = async (source: "document" | "photo") => {
    if (busy) return;
    setBusy(source);
    setError("");
    try {
      const file = await pickAttachment(source);
      if (!file) return;
      await apiUpload(`/api/v1/expenses/${expenseId}/attachments`, file);
      await onSaved();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not upload attachment.",
      );
    } finally {
      setBusy(null);
    }
  };
  return (
    <Card>
      <Text style={s.section}>Attachments</Text>
      <Text style={s.sectionHelp}>
        Receipts and documents · {attachments.length}
      </Text>
      {attachments.map((file) => (
        <View style={s.row} key={file.id}>
          <View style={s.attachmentIcon}>
            <AntDesign
              name={
                (file.mime_type.includes("pdf")
                  ? "pdffile1"
                  : "picture") as never
              }
              size={14}
              color={colors.teal}
            />
          </View>
          <Pressable
            style={{ flex: 1, minWidth: 0 }}
            onPress={() =>
              void shareApiFile(file.file_url, file.file_name).catch(
                (cause: unknown) =>
                  setError(
                    cause instanceof Error
                      ? cause.message
                      : "Could not download attachment.",
                  ),
              )
            }
            accessibilityRole="button"
            accessibilityLabel={`Download ${file.file_name}`}
          >
            <Text style={s.item} numberOfLines={1}>
              {file.file_name}
            </Text>
            <Text style={s.meta}>
              {Math.ceil(file.size_bytes / 1024)} KB · {file.mime_type}
            </Text>
          </Pressable>
          <ConfirmAction
            title="Remove attachment?"
            description={`Remove “${file.file_name}” from this expense. This cannot be undone.`}
            label="Remove"
            onConfirm={async () => {
              await apiFetch(`/api/v1/attachments/${file.id}`, {
                method: "DELETE",
              });
              await onSaved();
            }}
          >
            {(open) => (
              <Pressable onPress={open} hitSlop={10} style={s.deleteSm}>
                <AntDesign name="delete" size={15} color={colors.coral} />
              </Pressable>
            )}
          </ConfirmAction>
        </View>
      ))}
      {!attachments.length ? (
        <Empty
          icon="file"
          title="No attachments"
          text="Add a receipt or document to keep proof with this expense."
        />
      ) : null}
      <View style={s.upload}>
        <Pressable
          style={[s.uploadBtn, busy === "photo" && s.uploadBtnDisabled]}
          onPress={() => void upload("photo")}
          disabled={!!busy}
          accessibilityRole="button"
        >
          {busy === "photo" ? (
            <ActivityIndicator size="small" color={colors.teal} />
          ) : (
            <AntDesign name="camera" size={14} color={colors.teal} />
          )}
          <Text style={s.uploadText}>Photo</Text>
        </Pressable>
        <Pressable
          style={[s.uploadBtn, busy === "document" && s.uploadBtnDisabled]}
          onPress={() => void upload("document")}
          disabled={!!busy}
          accessibilityRole="button"
        >
          {busy === "document" ? (
            <ActivityIndicator size="small" color={colors.teal} />
          ) : (
            <AntDesign name={"file" as never} size={14} color={colors.teal} />
          )}
          <Text style={s.uploadText}>Document</Text>
        </Pressable>
      </View>
      {error ? <ErrorNotice message={error} /> : null}
    </Card>
  );
}

const s = StyleSheet.create({
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
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
  summary: { backgroundColor: colors.paper, borderColor: colors.line, gap: 6 },
  summaryLabel: {
    color: colors.muted,
    fontSize: 10,
    letterSpacing: 1.2,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  summaryAmount: {
    color: colors.teal,
    fontFamily: "serif",
    fontSize: 30,
    lineHeight: 34,
  },
  summaryMeta: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },
  summaryHelp: { color: colors.muted, fontSize: 11, lineHeight: 14 },
  dialog: {
    color: colors.ink,
    fontFamily: "serif",
    fontSize: 20,
    lineHeight: 24,
  },
  eyebrow: {
    color: colors.teal,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  sheetHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
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
  labelSmall: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 6,
  },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    minHeight: 36,
  },
  chipActive: { backgroundColor: colors.teal, borderColor: colors.teal },
  chipText: { color: colors.ink, fontSize: 11, fontWeight: "700" },
  chipTextActive: { color: colors.white },
  categoryRow: {
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
  categoryRowActive: { backgroundColor: colors.sage, borderColor: colors.teal },
  categoryCheck: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.paper,
  },
  categoryCheckActive: {
    backgroundColor: colors.teal,
    borderColor: colors.teal,
  },
  itemActive: { fontWeight: "800", color: colors.ink },
  row: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingVertical: 6,
  },
  item: { color: colors.ink, fontSize: 13, fontWeight: "600", lineHeight: 16 },
  meta: { color: colors.muted, fontSize: 11, lineHeight: 14 },
  metaSmall: { color: colors.muted, fontSize: 10, marginTop: 4 },
  note: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  noteBox: {
    backgroundColor: colors.sage,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    padding: 12,
    gap: 4,
    marginTop: 8,
  },
  noteLabel: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  avatarTiny: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: colors.sage,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarTinyText: { fontSize: 11, fontWeight: "800", color: colors.teal },
  upload: { flexDirection: "row", gap: 10, marginTop: 4 },
  uploadBtn: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    borderRadius: 12,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadBtnDisabled: { opacity: 0.7 },
  uploadText: { fontSize: 12, fontWeight: "800", color: colors.ink },
  deleteSm: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  attachmentIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.sage,
    alignItems: "center",
    justifyContent: "center",
  },
});
