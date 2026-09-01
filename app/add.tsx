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

function parseCents(str: string): number {
  const cleaned = str.replace(/,/g, "").trim();
  if (!cleaned) return 0;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return NaN;
  return Math.round(n * 100);
}

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
          setParticipants(r.data.map((m) => m.id));
          setPayer(user?.id || r.data[0]?.id || "");
        })
        .catch((e) => setError(e.message));
  }, [groupId, user?.id]);

  const currency = groups.find((g) => g.id === groupId)?.currency || "NPR";
  const cents = parseCents(amount);
  const perPerson =
    participants.length && Number.isFinite(cents) && cents > 0
      ? (cents / participants.length / 100).toFixed(2)
      : null;

  const save = async () => {
    if (busy) return;
    if (!description.trim()) {
      setError("Add a description for this expense.");
      return;
    }
    if (!Number.isFinite(cents) || cents <= 0) {
      setError("Enter an amount greater than 0.");
      return;
    }
    if (!payer) {
      setError("Choose who paid.");
      return;
    }
    if (!participants.length) {
      setError("Select at least one participant.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const idempotency = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      await apiFetch(`/api/v1/groups/${groupId}/expenses`, {
        method: "POST",
        headers: { "Idempotency-Key": idempotency },
        body: JSON.stringify({
          description: description.trim(),
          amount: cents,
          currency,
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
              accessibilityRole="button"
              accessibilityLabel="Close add expense"
              hitSlop={8}
            >
              <AntDesign name="arrow-left" size={20} color={colors.ink} />
            </Pressable>
            <Text style={s.headerTitle}>Add expense</Text>
            <View style={s.headerSpacer} />
          </View>
          <Text style={s.eyebrow}>NEW RECORD</Text>
          <Text style={s.title}>Where does this belong?</Text>
          <Text style={s.intro}>
            Choose how you want to track this spending.
          </Text>

          <Pressable
            style={({ pressed }) => [s.choice, pressed && s.choicePressed]}
            onPress={() => setKind("shared")}
            accessibilityRole="button"
            accessibilityLabel="Shared expense, split with a group"
          >
            <View style={s.choiceIcon}>
              <AntDesign name="team" size={20} color={colors.teal} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.choiceTitle}>Shared expense</Text>
              <Text style={s.help}>
                Split equally with a group. You’ll choose participants next.
              </Text>
            </View>
            <AntDesign name="right" size={14} color={colors.muted} />
          </Pressable>

          <Pressable
            style={({ pressed }) => [s.choice, pressed && s.choicePressed]}
            onPress={() => router.replace("/(tabs)/personal?new=1")}
            accessibilityRole="button"
            accessibilityLabel="Personal expense, keep in your budget"
          >
            <View style={s.choiceIcon}>
              <AntDesign name="wallet" size={20} color={colors.teal} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.choiceTitle}>Personal expense</Text>
              <Text style={s.help}>
                Keep it in your personal budget. No splitting.
              </Text>
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
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={s.page}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={s.header}>
            <Pressable
              style={s.back}
              onPress={() => (busy ? null : router.back())}
              accessibilityRole="button"
              accessibilityLabel="Back"
              hitSlop={8}
            >
              <AntDesign name="arrow-left" size={20} color={colors.ink} />
            </Pressable>
            <Text style={s.headerTitle}>New expense</Text>
            <Pressable
              style={s.headerAction}
              onPress={() => setKind("choose")}
              accessibilityRole="button"
              accessibilityLabel="Change expense type"
            >
              <Text style={s.headerActionText}>Change</Text>
            </Pressable>
          </View>

          <Text style={s.eyebrow}>SHARED EXPENSE · EQUAL SPLIT</Text>
          <Text style={s.title}>Add an expense</Text>
          <Text style={s.intro}>
            Start with the essentials. Everyone selected will split this
            equally. You can fine-tune unequal splits after saving.
          </Text>

          {groupsLoading ? (
            <View style={s.loadingRow}>
              <ActivityIndicator color={colors.teal} />
              <Text style={s.help}>Loading groups…</Text>
            </View>
          ) : null}

          {!groupsLoading && !groups.length ? (
            <View style={s.noGroups} accessible>
              <View style={s.noGroupsIcon}>
                <AntDesign name="team" size={20} color={colors.teal} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.noGroupsTitle}>Create a group first</Text>
                <Text style={s.help}>
                  Shared expenses need a group. Create one in seconds.
                </Text>
              </View>
              <Pressable
                onPress={() => router.replace("/(tabs)/groups?new=1")}
                accessibilityRole="button"
                accessibilityLabel="Create a group"
                style={s.miniCta}
              >
                <Text style={s.miniCtaText}>Create</Text>
              </Pressable>
            </View>
          ) : null}

          <Text style={s.label}>Group</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.chips}
          >
            {groups.map((g) => {
              const active = groupId === g.id;
              return (
                <Pressable
                  key={g.id}
                  onPress={() => setGroupId(g.id)}
                  style={[s.chip, active && s.chipActive]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`Group ${g.name}`}
                >
                  <AntDesign
                    name="team"
                    size={14}
                    color={active ? colors.white : colors.teal}
                  />
                  <Text
                    style={[s.chipText, active && s.chipTextActive]}
                    numberOfLines={1}
                  >
                    {g.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={s.label}>Description *</Text>
          <TextInput
            testID="expense-description"
            value={description}
            onChangeText={(v) => {
              setDescription(v);
              if (error) setError("");
            }}
            placeholder="Dinner, taxi, groceries…"
            placeholderTextColor={colors.muted}
            style={[
              s.input,
              !description.trim() && description.length > 0
                ? s.inputError
                : null,
            ]}
            returnKeyType="next"
            accessibilityLabel="Description"
            maxLength={120}
          />

          <Text style={s.label}>Amount *</Text>
          <View
            style={[
              s.amountBox,
              !Number.isFinite(cents) || (amount.length > 0 && cents <= 0)
                ? s.amountBoxError
                : null,
            ]}
          >
            <View style={s.currencyPill}>
              <Text style={s.currency}>{currency}</Text>
            </View>
            <TextInput
              testID="expense-amount"
              value={amount}
              onChangeText={(v) => {
                setAmount(v.replace(/[^0-9.,]/g, ""));
                if (error) setError("");
              }}
              placeholder="0.00"
              placeholderTextColor={colors.muted}
              keyboardType="decimal-pad"
              style={s.amountInput}
              accessibilityLabel="Expense amount"
              returnKeyType="done"
            />
          </View>
          <Text style={s.help}>Use numbers only. Example: 12.34</Text>

          <Text style={s.label}>Paid by</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.chips}
          >
            {members.map((member) => {
              const active = payer === member.id;
              return (
                <Pressable
                  key={member.id}
                  onPress={() => setPayer(member.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  style={[s.chip, active && s.chipActive]}
                >
                  <Text
                    style={[s.chipText, active && s.chipTextActive]}
                    numberOfLines={1}
                  >
                    {member.id === user?.id ? "You" : member.name}
                  </Text>
                  {active ? (
                    <AntDesign name="check" size={12} color={colors.white} />
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={s.label}>
            Split with · {participants.length} selected
          </Text>
          <Pressable
            onPress={() => setParticipantsOpen((o) => !o)}
            accessibilityRole="button"
            accessibilityLabel="Choose participants"
            style={s.peopleSummary}
          >
            <View style={s.peopleSummaryIcon}>
              <AntDesign name="team" size={16} color={colors.teal} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.peopleSummaryTitle} numberOfLines={1}>
                {participants.length}{" "}
                {participants.length === 1 ? "person" : "people"} · Split
                equally
              </Text>
              <Text style={s.help} numberOfLines={1}>
                {participantsOpen
                  ? "Tap Done when finished"
                  : "Everyone included by default — tap to change"}
              </Text>
            </View>
            <View style={s.peopleSummaryAction}>
              <Text style={s.selectAll}>
                {participantsOpen ? "Done" : "Change"}
              </Text>
              <AntDesign
                name={participantsOpen ? "up" : "down"}
                size={12}
                color={colors.teal}
              />
            </View>
          </Pressable>

          {participantsOpen ? (
            <View style={s.people}>
              <Pressable
                onPress={() => setParticipants(members.map((m) => m.id))}
                style={s.selectAllRow}
                accessibilityRole="button"
              >
                <AntDesign name="check-square" size={14} color={colors.teal} />
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
                          size={12}
                          color={colors.white}
                        />
                      ) : null}
                    </View>
                    <Text style={s.personName} numberOfLines={1}>
                      {member.id === user?.id ? "You" : member.name}
                    </Text>
                    {selected ? (
                      <AntDesign
                        name="check-circle"
                        size={14}
                        color={colors.teal}
                      />
                    ) : null}
                  </Pressable>
                );
              })}
              {members.length === 0 ? (
                <View style={s.personEmpty}>
                  <Text style={s.help}>No members found.</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          <View style={s.split}>
            <View style={s.splitIcon}>
              <AntDesign name="team" size={16} color={colors.teal} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.splitTitle}>Split equally</Text>
              <Text style={s.help} numberOfLines={2}>
                {participants.length
                  ? `Split between ${participants.length} ${participants.length === 1 ? "person" : "people"}`
                  : "Select at least one person"}
                {perPerson ? ` · ${currency} ${perPerson} each` : ""}
              </Text>
            </View>
          </View>

          {error ? (
            <View style={s.errorBox}>
              <AntDesign
                name="exclamation-circle"
                size={14}
                color={colors.coral}
              />
              <Text style={s.error}>{error}</Text>
            </View>
          ) : null}

          <Pressable
            testID="expense-submit"
            style={({ pressed }) => [
              s.cta,
              (busy || !members.length || !participants.length) &&
                s.ctaDisabled,
              pressed &&
                !(busy || !members.length || !participants.length) &&
                s.ctaPressed,
            ]}
            onPress={save}
            disabled={busy || !members.length || !participants.length}
            accessibilityRole="button"
            accessibilityState={{
              disabled: busy || !members.length || !participants.length,
            }}
          >
            {busy ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <AntDesign
                name="check"
                size={16}
                color={
                  busy || !members.length || !participants.length
                    ? colors.muted
                    : colors.white
                }
              />
            )}
            <Text
              style={[
                s.ctaText,
                (busy || !members.length || !participants.length) &&
                  s.ctaTextDisabled,
              ]}
            >
              {busy ? "Saving…" : "Save expense"}
            </Text>
          </Pressable>
          <Text style={s.foot}>
            Saves as an equal split. Edit later for exact, percentage, or
            shares.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  page: { padding: 16, paddingBottom: 32, gap: 4 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  headerSpacer: { width: 40, height: 40 },
  headerTitle: {
    fontWeight: "800",
    fontSize: 13,
    color: colors.ink,
    flex: 1,
    textAlign: "center",
  },
  headerAction: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  headerActionText: { fontSize: 11, fontWeight: "800", color: colors.teal },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 1.6,
    color: colors.teal,
    fontWeight: "800",
    textTransform: "uppercase",
    marginTop: 8,
  },
  title: {
    fontFamily: type.title,
    fontSize: 26,
    color: colors.ink,
    marginTop: 4,
    lineHeight: 30,
  },
  intro: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 6,
    marginBottom: 12,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.ink,
    marginTop: 14,
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  chips: { gap: 8, paddingVertical: 2 },
  chip: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 12,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    backgroundColor: colors.paper,
    minHeight: 36,
  },
  chipActive: { backgroundColor: colors.teal, borderColor: colors.teal },
  chipText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.ink,
    maxWidth: 140,
  },
  chipTextActive: { color: colors.white },
  people: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    overflow: "hidden",
    marginTop: 8,
  },
  peopleSummary: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    minHeight: 56,
    paddingHorizontal: 12,
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
  peopleSummaryTitle: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 16,
  },
  peopleSummaryAction: { flexDirection: "row", alignItems: "center", gap: 6 },
  selectAll: { fontSize: 11, fontWeight: "800", color: colors.teal },
  selectAllRow: {
    minHeight: 44,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: colors.sage,
  },
  person: {
    minHeight: 48,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  personEmpty: { padding: 16, alignItems: "center" },
  personName: { color: colors.ink, fontSize: 13, fontWeight: "600", flex: 1 },
  check: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.paper,
  },
  checkActive: { borderColor: colors.teal, backgroundColor: colors.teal },
  input: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.ink,
    minHeight: 44,
  },
  inputError: { borderColor: colors.coral },
  amountBox: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    minHeight: 56,
    gap: 8,
  },
  amountBoxError: { borderColor: colors.coral },
  currencyPill: {
    backgroundColor: colors.sage,
    paddingHorizontal: 10,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  currency: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.teal,
  },
  amountInput: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 12,
    paddingHorizontal: 4,
    fontFamily: type.title,
    fontSize: 24,
    color: colors.ink,
    textAlign: "right",
  },
  split: {
    marginTop: 14,
    backgroundColor: colors.sage,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  splitIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.paper,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.line,
  },
  splitTitle: { fontSize: 11, fontWeight: "800", color: colors.ink },
  help: { fontSize: 11, color: colors.muted, marginTop: 2, lineHeight: 14 },
  errorBox: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    backgroundColor: colors.coralSoft,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  error: { color: colors.coral, fontSize: 12, flex: 1, lineHeight: 16 },
  cta: {
    backgroundColor: colors.teal,
    borderRadius: 12,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
  },
  ctaDisabled: {
    backgroundColor: colors.sage,
    opacity: 0.9,
    borderWidth: 1,
    borderColor: colors.line,
  },
  ctaPressed: { opacity: 0.9 },
  ctaText: { color: colors.white, fontWeight: "800", fontSize: 13 },
  ctaTextDisabled: { color: colors.muted },
  foot: {
    fontSize: 10,
    color: colors.muted,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 13,
  },
  choice: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 10,
    minHeight: 78,
  },
  choicePressed: { opacity: 0.96 },
  choiceIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.sage,
    alignItems: "center",
    justifyContent: "center",
  },
  choiceTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 18,
  },
  noGroups: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.sage,
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
  },
  noGroupsIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.paper,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.line,
  },
  noGroupsTitle: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
  },
  miniCta: {
    backgroundColor: colors.teal,
    paddingHorizontal: 14,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  miniCtaText: { color: colors.white, fontWeight: "800", fontSize: 11 },
});
