import AntDesign from "@expo/vector-icons/AntDesign";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { apiFetch } from "../src/api";
import { useSession } from "../src/session";
import { colors, type } from "../src/theme";
import { labelize } from "../src/types";
type Group = { id: string; name: string; currency: string };
type Member = { id: string; name: string };
export default function Add() {
  const { user } = useSession();
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupId, setGroupId] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState(user?.id || "");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [mode, setMode] = useState<"EQUAL" | "EXACT" | "PERCENTAGE" | "SHARES">(
    "EQUAL",
  );
  const [selected, setSelected] = useState<string[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [kind, setKind] = useState<"choose" | "shared">("choose");
  useEffect(() => {
    apiFetch<{ data: Group[] }>("/api/v1/groups")
      .then((r) => {
        setGroups(r.data);
        setGroupId(r.data[0]?.id || "");
      })
      .catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    if (groupId)
      apiFetch<{ data: Member[] }>(`/api/v1/groups/${groupId}/members`)
        .then((r) => {
          setMembers(r.data);
          setSelected(r.data.map((m) => m.id));
          if (r.data.length && !r.data.some((m) => m.id === paidBy)) {
            setPaidBy(r.data[0].id);
          } else if (!paidBy && user?.id) {
            setPaidBy(user.id);
          }
        })
        .catch((e) => setError(e.message));
  }, [groupId]);
  useEffect(() => {
    if (user?.id && !paidBy) setPaidBy(user.id);
  }, [user?.id, paidBy]);
  const save = async () => {
    const cents = Math.round(Number(amount) * 100);
    if (!description.trim() || !Number.isFinite(cents) || cents <= 0) {
      setError("Enter a description and an amount greater than zero.");
      return;
    }
    if (!selected.length) {
      setError("Select at least one participant.");
      return;
    }
    if (mode !== "EQUAL") {
      for (const uid of selected) {
        const v = values[uid];
        if (
          v === undefined ||
          v === "" ||
          Number.isNaN(Number(v)) ||
          Number(v) <= 0
        ) {
          setError(
            `Enter a valid ${mode.toLowerCase()} value for every participant.`,
          );
          return;
        }
      }
    }
    setBusy(true);
    setError("");
    try {
      const group = groups.find((g) => g.id === groupId);
      const splits = selected.map((uid) => ({
        user_id: uid,
        ...(mode === "EXACT"
          ? { amount: Math.round(Number(values[uid] || 0) * 100) }
          : mode === "PERCENTAGE"
            ? { percentage: Number(values[uid] || 0) }
            : mode === "SHARES"
              ? { shares: Number(values[uid] || 0) }
              : {}),
      }));
      await apiFetch(`/api/v1/groups/${groupId}/expenses`, {
        method: "POST",
        headers: { "Idempotency-Key": `${Date.now()}-${Math.random()}` },
        body: JSON.stringify({
          description: description.trim(),
          amount: cents,
          currency: group?.currency || "NPR",
          paid_by: paidBy || user?.id,
          expense_date: date,
          split_mode: mode,
          splits,
        }),
      });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save expense.");
    } finally {
      setBusy(false);
    }
  };
  if (kind === "choose") {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.page}>
          <View style={s.header}>
            <Pressable
              style={s.back}
              onPress={() => router.back()}
              accessibilityLabel="Close add expense"
            >
              <AntDesign name="arrow-left" size={20} color={colors.ink} />
            </Pressable>
            <Text style={s.headerTitle}>Add expense</Text>
            <View style={s.back} />
          </View>
          <Text style={s.eyebrow}>NEW RECORD</Text>
          <Text style={s.title}>Where does this belong?</Text>
          <Pressable style={s.choice} onPress={() => setKind("shared")}>
            <AntDesign name="team" size={23} color={colors.teal} />
            <View style={{ flex: 1 }}>
              <Text style={s.choiceTitle}>Shared expense</Text>
              <Text style={s.help}>Split an expense with a group.</Text>
            </View>
            <AntDesign name="right" size={14} color={colors.muted} />
          </Pressable>
          <Pressable
            style={s.choice}
            onPress={() => router.replace("/(tabs)/personal?new=1")}
          >
            <AntDesign name="wallet" size={23} color={colors.teal} />
            <View style={{ flex: 1 }}>
              <Text style={s.choiceTitle}>Personal expense</Text>
              <Text style={s.help}>Keep it in your personal budget.</Text>
            </View>
            <AntDesign name="right" size={14} color={colors.muted} />
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={s.page}
          keyboardShouldPersistTaps="handled"
        >
          <View style={s.header}>
            <Pressable
              style={s.back}
              onPress={() => router.back()}
              accessibilityLabel="Close add expense"
            >
              <AntDesign name="arrow-left" size={20} color={colors.ink} />
            </Pressable>
            <Text style={s.headerTitle}>New expense</Text>
            <View style={s.back} />
          </View>
          <Text style={s.eyebrow}>SHARED LEDGER</Text>
          <Text style={s.title}>What did you pay for?</Text>
          {!groups.length && !error ? (
            <ActivityIndicator color={colors.teal} />
          ) : null}
          <Text style={s.label}>Group</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.chips}
          >
            {groups.map((g) => (
              <Pressable
                key={g.id}
                onPress={() => setGroupId(g.id)}
                style={[s.chip, groupId === g.id && s.chipActive]}
              >
                <AntDesign
                  name="team"
                  size={15}
                  color={groupId === g.id ? colors.white : colors.teal}
                />
                <Text
                  style={[s.chipText, groupId === g.id && s.chipTextActive]}
                >
                  {g.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <Text style={s.label}>Description</Text>
          <TextInput
            testID="expense-description"
            value={description}
            onChangeText={setDescription}
            placeholder="Dinner, taxi, groceries…"
            placeholderTextColor={colors.muted}
            style={s.input}
          />
          <Text style={s.label}>Amount</Text>
          <View style={s.amountBox}>
            <Text style={s.currency}>
              {groups.find((g) => g.id === groupId)?.currency || "NPR"}
            </Text>
            <TextInput
              testID="expense-amount"
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor={colors.muted}
              keyboardType="decimal-pad"
              style={s.amountInput}
            />
          </View>
          <Text style={s.label}>Paid by</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.chips}
          >
            {members.map((m) => (
              <Pressable
                key={m.id}
                onPress={() => setPaidBy(m.id)}
                style={[s.chip, paidBy === m.id && s.chipActive]}
              >
                <Text style={[s.chipText, paidBy === m.id && s.chipTextActive]}>
                  {m.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <Text style={s.label}>Date</Text>
          <TextInput
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.muted}
            style={s.input}
          />
          <Text style={s.label}>How should it be split?</Text>
          <View style={s.modeRow}>
            {(["EQUAL", "EXACT", "PERCENTAGE", "SHARES"] as const).map((m) => (
              <Pressable
                key={m}
                onPress={() => setMode(m)}
                style={[s.modeChip, mode === m && s.modeChipActive]}
              >
                <Text style={[s.modeText, mode === m && s.modeTextActive]}>
                  {labelize(m)}
                </Text>
              </Pressable>
            ))}
          </View>
          {members.map((m) => {
            const checked = selected.includes(m.id);
            return (
              <View key={m.id} style={s.participant}>
                <Pressable
                  style={s.check}
                  onPress={() =>
                    setSelected(
                      checked
                        ? selected.filter((x) => x !== m.id)
                        : [...selected, m.id],
                    )
                  }
                >
                  <AntDesign
                    name={
                      (checked ? "check-square" : "check-square-o") as never
                    }
                    size={18}
                    color={colors.teal}
                  />
                </Pressable>
                <Text style={[s.splitTitle, { flex: 1 }]}>{m.name}</Text>
                {mode !== "EQUAL" && checked ? (
                  <TextInput
                    value={values[m.id] || ""}
                    onChangeText={(v) => setValues({ ...values, [m.id]: v })}
                    placeholder={
                      mode === "EXACT"
                        ? groups.find((g) => g.id === groupId)?.currency ||
                          "NPR"
                        : mode === "PERCENTAGE"
                          ? "%"
                          : "shares"
                    }
                    placeholderTextColor={colors.muted}
                    keyboardType="decimal-pad"
                    style={s.splitInput}
                  />
                ) : null}
              </View>
            );
          })}
          {error ? <Text style={s.error}>{error}</Text> : null}
          <Pressable
            testID="expense-submit"
            style={[s.cta, (busy || !members.length) && { opacity: 0.5 }]}
            onPress={save}
            disabled={busy || !members.length}
          >
            <Text style={s.ctaText}>{busy ? "Saving…" : "Save expense"}</Text>
            <AntDesign name="check" size={17} color={colors.white} />
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  page: { padding: 20, paddingBottom: 60 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  back: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: colors.paper,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontWeight: "800", fontSize: 13, color: colors.ink },
  eyebrow: {
    fontSize: 9,
    letterSpacing: 2,
    color: colors.teal,
    fontWeight: "800",
  },
  title: {
    fontFamily: type.title,
    fontSize: 31,
    color: colors.ink,
    marginTop: 4,
    marginBottom: 23,
  },
  label: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.ink,
    marginTop: 16,
    marginBottom: 8,
  },
  chips: { gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 13,
    paddingVertical: 10,
    paddingHorizontal: 13,
    flexDirection: "row",
    gap: 7,
    alignItems: "center",
    backgroundColor: colors.paper,
  },
  chipActive: { backgroundColor: colors.teal, borderColor: colors.teal },
  chipText: { fontSize: 10, fontWeight: "700", color: colors.ink },
  chipTextActive: { color: colors.white },
  input: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 15,
    padding: 16,
    fontSize: 14,
    color: colors.ink,
  },
  amountBox: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 15,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    minHeight: 60,
  },
  currency: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.teal,
    flexShrink: 0,
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 16,
    paddingHorizontal: 4,
    fontFamily: type.title,
    fontSize: 25,
    color: colors.ink,
    textAlign: "right",
  },
  split: {
    marginTop: 18,
    backgroundColor: colors.sage,
    borderRadius: 15,
    padding: 15,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  splitTitle: { fontSize: 11, fontWeight: "800", color: colors.ink },
  help: { fontSize: 9, color: colors.muted, marginTop: 3 },
  modeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  modeChip: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: colors.paper,
  },
  modeChipActive: { backgroundColor: colors.teal, borderColor: colors.teal },
  modeText: { color: colors.ink, fontSize: 9, fontWeight: "800" },
  modeTextActive: { color: colors.white },
  participant: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
  },
  check: { padding: 4 },
  splitInput: {
    width: 90,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: colors.paper,
    color: colors.ink,
    fontSize: 12,
    textAlign: "right",
  },
  error: { color: colors.coral, fontSize: 11, marginTop: 16 },
  cta: {
    backgroundColor: colors.teal,
    borderRadius: 15,
    padding: 17,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 9,
    marginTop: 25,
  },
  ctaText: { color: colors.white, fontWeight: "800", fontSize: 13 },
  choice: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 17,
    padding: 17,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    marginTop: 4,
  },
  choiceTitle: { color: colors.ink, fontSize: 14, fontWeight: "800" },
});
