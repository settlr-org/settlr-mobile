import AntDesign from "@expo/vector-icons/AntDesign";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiFetch } from "../src/api";
import { useSession } from "../src/session";
import { colors, type } from "../src/theme";
type Group = { id: string; name: string; currency: string };
type Member = { id: string; name: string };
export default function Add() {
  const { user } = useSession();
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [groupId, setGroupId] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [payer, setPayer] = useState("");
  const [participants, setParticipants] = useState<string[]>([]);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [kind, setKind] = useState<"choose" | "shared">("choose");
  useEffect(() => {
    apiFetch<{ data: Group[] }>("/api/v1/groups")
      .then((r) => {
        setGroups(r.data);
        setGroupId(r.data[0]?.id || "");
      })
      .catch((e) => setError(e.message))
      .finally(() => setGroupsLoading(false));
  }, []);
  useEffect(() => {
    if (groupId)
      apiFetch<{ data: Member[] }>(`/api/v1/groups/${groupId}/members`)
        .then((r) => {
          setMembers(r.data);
          setParticipants(r.data.map((member) => member.id));
          setPayer(user?.id || r.data[0]?.id || "");
        })
        .catch((e) => setError(e.message));
  }, [groupId, user?.id]);
  const save = async () => {
    const cents = Math.round(Number(amount) * 100);
    if (
      !description.trim() ||
      !Number.isFinite(cents) ||
      cents <= 0 ||
      !payer ||
      !participants.length
    ) {
      setError(
        "Add a description, amount, payer, and at least one participant.",
      );
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
          paid_by: payer,
          expense_date: new Date().toISOString().slice(0, 10),
          split_mode: "EQUAL",
          splits: participants.map((user_id) => ({ user_id })),
        }),
      });
      router.replace(`/groups/${groupId}`);
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
            <View style={s.headerSpacer} />
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
            <View style={s.headerSpacer} />
          </View>
          <Text style={s.eyebrow}>SHARED EXPENSE</Text>
          <Text style={s.title}>Add an expense</Text>
          <Text style={s.intro}>
            Start with the essentials. Everyone selected will split this
            equally.
          </Text>
          {groupsLoading ? <ActivityIndicator color={colors.teal} /> : null}
          {!groupsLoading && !groups.length ? (
            <View style={s.noGroups}>
              <AntDesign name="team" size={22} color={colors.teal} />
              <View style={{ flex: 1 }}>
                <Text style={s.noGroupsTitle}>Create a group first</Text>
                <Text style={s.help}>
                  Shared expenses need a group and at least one member.
                </Text>
              </View>
              <Pressable
                onPress={() => router.replace("/(tabs)/groups?new=1")}
                accessibilityRole="button"
                accessibilityLabel="Create a group"
              >
                <Text style={s.selectAll}>Create</Text>
              </Pressable>
            </View>
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
            returnKeyType="next"
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
              accessibilityLabel="Expense amount"
            />
          </View>
          <Text style={s.label}>Paid by</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.chips}
          >
            {members.map((member) => (
              <Pressable
                key={member.id}
                onPress={() => setPayer(member.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected: payer === member.id }}
                style={[s.chip, payer === member.id && s.chipActive]}
              >
                <Text
                  style={[s.chipText, payer === member.id && s.chipTextActive]}
                >
                  {member.id === user?.id ? "You" : member.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <Text style={s.label}>Split with</Text>
          <Pressable
            onPress={() => setParticipantsOpen((open) => !open)}
            accessibilityRole="button"
            accessibilityLabel="Choose participants"
            style={s.peopleSummary}
          >
            <View style={s.peopleSummaryIcon}>
              <AntDesign name="team" size={17} color={colors.teal} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.peopleSummaryTitle}>
                {participants.length}{" "}
                {participants.length === 1 ? "person" : "people"} selected
              </Text>
              <Text style={s.help}>Everyone is included by default</Text>
            </View>
            <Text style={s.selectAll}>
              {participantsOpen ? "Done" : "Change"}
            </Text>
          </Pressable>
          {participantsOpen ? (
            <View style={s.people}>
              <Pressable
                onPress={() =>
                  setParticipants(members.map((member) => member.id))
                }
                style={s.selectAllRow}
              >
                <Text style={s.selectAll}>Select everyone</Text>
              </Pressable>
              {members.map((member) => {
                const selected = participants.includes(member.id);
                return (
                  <Pressable
                    key={member.id}
                    onPress={() =>
                      setParticipants(
                        selected
                          ? participants.filter((id) => id !== member.id)
                          : [...participants, member.id],
                      )
                    }
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    style={s.person}
                  >
                    <View style={[s.check, selected && s.checkActive]}>
                      {selected ? (
                        <AntDesign
                          name="check"
                          size={13}
                          color={colors.white}
                        />
                      ) : null}
                    </View>
                    <Text style={s.personName}>
                      {member.id === user?.id ? "You" : member.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
          <View style={s.split}>
            <AntDesign name="team" size={18} color={colors.teal} />
            <View style={{ flex: 1 }}>
              <Text style={s.splitTitle}>Split equally</Text>
              <Text style={s.help}>
                {participants.length
                  ? `Split between ${participants.length} ${participants.length === 1 ? "person" : "people"}`
                  : "Select at least one person"}
                {amount && Number(amount) > 0 && participants.length
                  ? ` · ${groups.find((g) => g.id === groupId)?.currency || "NPR"} ${(Number(amount) / participants.length).toFixed(2)} each`
                  : ""}
              </Text>
            </View>
          </View>
          {error ? <Text style={s.error}>{error}</Text> : null}
          <Pressable
            testID="expense-submit"
            style={[
              s.cta,
              (busy || !members.length || !participants.length) && {
                opacity: 0.5,
              },
            ]}
            onPress={save}
            disabled={busy || !members.length || !participants.length}
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
  headerSpacer: { width: 42, height: 42 },
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
    marginBottom: 4,
  },
  intro: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 18,
  },
  label: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.ink,
    marginTop: 16,
    marginBottom: 8,
  },
  selectAll: { fontSize: 11, fontWeight: "800", color: colors.teal },
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
  people: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 15,
    overflow: "hidden",
  },
  peopleSummary: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 15,
    minHeight: 58,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  peopleSummaryIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.sage,
    alignItems: "center",
    justifyContent: "center",
  },
  peopleSummaryTitle: { color: colors.ink, fontSize: 13, fontWeight: "800" },
  selectAllRow: {
    minHeight: 42,
    paddingHorizontal: 14,
    justifyContent: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  person: {
    minHeight: 50,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  personName: { color: colors.ink, fontSize: 13, fontWeight: "700" },
  check: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  checkActive: { borderColor: colors.teal, backgroundColor: colors.teal },
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
  noGroups: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.sage,
    borderRadius: 15,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  noGroupsTitle: { color: colors.ink, fontSize: 12, fontWeight: "800" },
});
