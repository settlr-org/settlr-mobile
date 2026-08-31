import AntDesign from "@expo/vector-icons/AntDesign";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
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
  styles,
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
        <Loading />
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
  return (
    <Screen>
      <PageTitle
        eyebrow={group.name}
        title={expense.description}
        description={`${expense.expense_date} · ${money(expense.amount, expense.currency)}`}
        action={
          <Pressable style={s.icon} onPress={() => setEditing(true)}>
            <AntDesign name="edit" size={18} color={colors.teal} />
          </Pressable>
        }
      />
      {error ? <ErrorNotice message={error} retry={() => void load()} /> : null}
      <Card>
        <Text style={s.section}>Split</Text>
        {expense.splits?.map((split) => (
          <View key={split.user_id} style={s.row}>
            <Text style={[s.item, { flex: 1 }]}>
              {members.find((member) => member.id === split.user_id)?.name ||
                "Member"}
            </Text>
            <Text style={s.meta}>
              {expense.split_mode === "EXACT" && split.amount
                ? money(split.amount, expense.currency)
                : expense.split_mode === "PERCENTAGE"
                  ? `${split.percentage}%`
                  : expense.split_mode === "SHARES"
                    ? `${split.shares} shares`
                    : "Equal split"}
            </Text>
          </View>
        ))}
        <Text style={s.note}>{expense.notes || "No notes"}</Text>
      </Card>
      <Comments expenseId={id} comments={comments} onSaved={load} />
      <Attachments expenseId={id} attachments={attachments} onSaved={load} />
      <ConfirmAction
        title="Delete expense?"
        description={`“${expense.description}” will be permanently removed.`}
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
  onClose,
  onSaved,
}: {
  expense: Expense;
  categories: Category[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [description, setDescription] = useState(expense.description);
  const [amount, setAmount] = useState(String(expense.amount / 100));
  const [date, setDate] = useState(expense.expense_date);
  const [notes, setNotes] = useState(expense.notes || "");
  const [category, setCategory] = useState(expense.category_id || "");
  const [error, setError] = useState("");
  const save = async () => {
    try {
      await apiFetch(`/api/v1/expenses/${expense.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          description,
          amount: Math.round(Number(amount) * 100),
          currency: expense.currency,
          paid_by: expense.paid_by,
          expense_date: date,
          notes,
          category_id: category || null,
          split_mode: expense.split_mode,
          splits: expense.splits,
        }),
      });
      await onSaved();
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not update expense.",
      );
    }
  };
  return (
    <Modal transparent visible animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Card>
          <Text style={s.dialog}>Edit expense</Text>
          <Field
            label="Description"
            value={description}
            onChangeText={setDescription}
          />
          <Field
            label="Amount"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
          />
          <Field label="Date" value={date} onChangeText={setDate} />
          <Field
            label="Notes"
            value={notes}
            onChangeText={setNotes}
            multiline
          />
          {categories.map((item) => (
            <Pressable
              key={item.id}
              style={s.row}
              onPress={() => setCategory(item.id)}
            >
              <Text style={s.item}>
                {category === item.id ? "✓ " : ""}
                {item.name}
              </Text>
            </Pressable>
          ))}
          {error ? <ErrorNotice message={error} /> : null}
          <View style={styles.dialogActions}>
            <Button label="Cancel" secondary onPress={onClose} />
            <Button label="Save changes" onPress={() => void save()} />
          </View>
        </Card>
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
  const add = async () => {
    if (!body.trim()) return;
    try {
      await apiFetch(`/api/v1/expenses/${expenseId}/comments`, {
        method: "POST",
        body: JSON.stringify({ body }),
      });
      setBody("");
      await onSaved();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not add comment.",
      );
    }
  };
  return (
    <Card>
      <Text style={s.section}>Comments</Text>
      {comments.map((comment) => (
        <View style={s.row} key={comment.id}>
          <View style={{ flex: 1 }}>
            <Text style={s.item}>{comment.name}</Text>
            <Text style={s.note}>{comment.body}</Text>
          </View>
        </View>
      ))}
      {!comments.length ? <Text style={s.note}>No comments yet.</Text> : null}
      <Field
        label="Add a comment"
        value={body}
        onChangeText={setBody}
        placeholder="Write a comment"
      />
      <Button label="Comment" secondary onPress={() => void add()} />
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
  const upload = async (source: "document" | "photo") => {
    try {
      const file = await pickAttachment(source);
      if (!file) return;
      await apiUpload(`/api/v1/expenses/${expenseId}/attachments`, file);
      await onSaved();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not upload attachment.",
      );
    }
  };
  return (
    <Card>
      <Text style={s.section}>Attachments</Text>
      {attachments.map((file) => (
        <View style={s.row} key={file.id}>
          <Pressable
            style={{ flex: 1 }}
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
          >
            <Text style={s.item}>{file.file_name}</Text>
            <Text style={s.meta}>{Math.ceil(file.size_bytes / 1024)} KB</Text>
          </Pressable>
          <ConfirmAction
            title="Remove attachment?"
            description={`Remove “${file.file_name}” from this expense.`}
            label="Remove"
            onConfirm={async () => {
              await apiFetch(`/api/v1/attachments/${file.id}`, {
                method: "DELETE",
              });
              await onSaved();
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
      {!attachments.length ? (
        <Empty
          icon="file"
          title="No attachments"
          text="Add a receipt or document."
        />
      ) : null}
      <View style={s.upload}>
        <Button label="Photo" secondary onPress={() => void upload("photo")} />
        <Button
          label="Document"
          secondary
          onPress={() => void upload("document")}
        />
      </View>
      {error ? <ErrorNotice message={error} /> : null}
    </Card>
  );
}
const s = StyleSheet.create({
  icon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  section: { color: colors.ink, fontFamily: "serif", fontSize: 22 },
  dialog: { color: colors.ink, fontFamily: "serif", fontSize: 25 },
  row: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    borderTopWidth: 1,
    borderColor: colors.line,
  },
  item: { color: colors.ink, fontSize: 12, fontWeight: "800" },
  meta: { color: colors.muted, fontSize: 10 },
  note: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  upload: { flexDirection: "row", gap: 8 },
});
