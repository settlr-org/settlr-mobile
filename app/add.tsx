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
type Group = { id: string; name: string; currency: string };
type Member = { id: string; name: string };
export default function Add() {
  const { user } = useSession();
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupId, setGroupId] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
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
        .then((r) => setMembers(r.data))
        .catch((e) => setError(e.message));
  }, [groupId]);
  const save = async () => {
    const cents = Math.round(Number(amount) * 100);
    if (!description.trim() || !Number.isFinite(cents) || cents <= 0) {
      setError("Enter a description and an amount greater than zero.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const group = groups.find((g) => g.id === groupId);
      await apiFetch(`/api/v1/groups/${groupId}/expenses`, {
        method: "POST",
        headers: { "Idempotency-Key": `${Date.now()}-${Math.random()}` },
        body: JSON.stringify({
          description: description.trim(),
          amount: cents,
          currency: group?.currency || "NPR",
          paid_by: user?.id,
          expense_date: new Date().toISOString().slice(0, 10),
          split_mode: "EQUAL",
          splits: members.map((m) => ({ user_id: m.id })),
        }),
      });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save expense.");
    } finally {
      setBusy(false);
    }
  };
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
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor={colors.muted}
              keyboardType="decimal-pad"
              style={s.amountInput}
            />
          </View>
          <View style={s.split}>
            <AntDesign name="team" size={18} color={colors.teal} />
            <View>
              <Text style={s.splitTitle}>Split equally</Text>
              <Text style={s.help}>
                Across {members.length}{" "}
                {members.length === 1 ? "member" : "members"} · paid by you
              </Text>
            </View>
          </View>
          {error ? <Text style={s.error}>{error}</Text> : null}
          <Pressable
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
});
