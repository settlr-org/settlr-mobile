import AntDesign from "@expo/vector-icons/AntDesign";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
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
type SplitMode = "EQUAL" | "EXACT" | "PERCENTAGE" | "SHARES";

function parseCents(str: string): number {
  const cleaned = str.replace(/,/g, "").trim();
  if (!cleaned) return 0;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return NaN;
  return Math.round(n * 100);
}

function splitDefaults(mode: SplitMode, ids: string[], cents: number) {
  if (mode === "EQUAL") return {};
  if (mode === "SHARES") return Object.fromEntries(ids.map((id) => [id, "1"]));
  if (!ids.length || !Number.isFinite(cents) || cents <= 0)
    return Object.fromEntries(ids.map((id) => [id, ""]));
  if (mode === "EXACT") {
    const base = Math.floor(cents / ids.length);
    const remainder = cents - base * ids.length;
    return Object.fromEntries(
      ids.map((id, index) => [
        id,
        ((base + (index < remainder ? 1 : 0)) / 100).toFixed(2),
      ]),
    );
  }
  const base = Math.floor(10000 / ids.length) / 100;
  const remainder = 100 - base * ids.length;
  return Object.fromEntries(
    ids.map((id, index) => [
      id,
      (index === ids.length - 1 ? base + remainder : base).toFixed(2),
    ]),
  );
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
  const [splitMode, setSplitMode] = useState<SplitMode>("EQUAL");
  const [splitValues, setSplitValues] = useState<Record<string, string>>({});
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [notes, setNotes] = useState("");
  const [expenseDate, setExpenseDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [categories, setCategories] = useState<{ id: string; name: string }[]>(
    [],
  );
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
    apiFetch<{ data: { id: string; name: string }[] }>("/api/v1/categories")
      .then((r) => setCategories(r.data))
      .catch(() => {});
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
  const splitTitle =
    splitMode === "EQUAL"
      ? "Split equally"
      : splitMode === "EXACT"
        ? "Split exact amounts"
        : splitMode === "PERCENTAGE"
          ? "Split by percentage"
          : "Split by shares";

  useEffect(() => {
    if (participants.length < 2 && splitMode !== "EQUAL") {
      setSplitMode("EQUAL");
      setSplitValues({});
    }
  }, [participants.length, splitMode]);

  const changeSplitMode = (mode: SplitMode) => {
    setSplitMode(mode);
    setSplitValues(splitDefaults(mode, participants, cents));
    setError("");
  };

  const toggleParticipant = (id: string) => {
    const next = participants.includes(id)
      ? participants.filter((item) => item !== id)
      : [...participants, id];
    setParticipants(next);
    if (splitMode !== "EQUAL") {
      setSplitValues((current) => ({
        ...splitDefaults(
          splitMode,
          next.filter((item) => !current[item]),
          cents,
        ),
        ...Object.fromEntries(
          Object.entries(current).filter(([item]) => next.includes(item)),
        ),
      }));
    }
  };

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
    const splits = participants.map((user_id) => {
      const raw = splitValues[user_id]?.replace(/,/g, "").trim() || "";
      if (splitMode === "EXACT") return { user_id, amount: parseCents(raw) };
      if (splitMode === "PERCENTAGE")
        return { user_id, percentage: Number(raw) };
      if (splitMode === "SHARES") return { user_id, shares: Number(raw) };
      return { user_id };
    });
    if (
      splitMode === "EXACT" &&
      (splits.some((split) => !Number.isFinite(split.amount)) ||
        splits.reduce((sum, split) => sum + (split.amount || 0), 0) !== cents)
    ) {
      setError("Exact amounts must add up to the expense total.");
      return;
    }
    if (
      splitMode === "PERCENTAGE" &&
      (splits.some((split) => !Number.isFinite(split.percentage)) ||
        Math.round(
          splits.reduce((sum, split) => sum + (split.percentage || 0), 0) * 100,
        ) /
          100 !==
          100)
    ) {
      setError("Percentages must add up to 100%.");
      return;
    }
    if (
      splitMode === "SHARES" &&
      splits.some(
        (split) => !Number.isFinite(split.shares) || (split.shares || 0) <= 0,
      )
    ) {
      setError("Give every selected person at least one share.");
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
          expense_date: expenseDate,
          category_id: categoryId || undefined,
          notes: notes.trim() || undefined,
          split_mode: splitMode,
          splits,
        }),
      });
      router.replace(`/groups/${groupId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save expense.");
    } finally {
      setBusy(false);
    }
  };

  const submitButton = (
    <Pressable
      testID="expense-submit"
      style={({ pressed }) => [
        s.cta,
        (busy || !members.length || !participants.length) && s.ctaDisabled,
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
  );

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
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={s.page}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
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
          <View style={s.chipScrollWrap}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[s.chips, { paddingRight: 24 }]}
              style={s.chipScroll}
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
            <View style={s.chipFade} pointerEvents="none" />
          </View>

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
              onSubmitEditing={Keyboard.dismiss}
            />
          </View>
          <Text style={s.help}>Use numbers only. Example: 12.34</Text>

          <Text style={s.label}>Category (optional)</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.chips}
          >
            <Pressable
              onPress={() => setCategoryId("")}
              style={[s.chip, !categoryId && s.chipActive]}
              accessibilityRole="button"
              accessibilityLabel="No category"
            >
              <Text style={[s.chipText, !categoryId && s.chipTextActive]}>
                None
              </Text>
            </Pressable>
            {categories.map((c) => {
              const active = categoryId === c.id;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => setCategoryId(c.id)}
                  style={[s.chip, active && s.chipActive]}
                  accessibilityRole="button"
                  accessibilityLabel={`Category ${c.name}`}
                >
                  <Text
                    style={[s.chipText, active && s.chipTextActive]}
                    numberOfLines={1}
                  >
                    {c.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={s.label}>Date</Text>
          <TextInput
            testID="expense-date"
            value={expenseDate}
            onChangeText={setExpenseDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.muted}
            style={s.input}
            accessibilityLabel="Expense date"
          />

          <Text style={s.label}>Notes (optional)</Text>
          <TextInput
            testID="expense-notes"
            value={notes}
            onChangeText={setNotes}
            placeholder="Add a note…"
            placeholderTextColor={colors.muted}
            style={[s.input, s.inputMultiline]}
            multiline
            numberOfLines={2}
            accessibilityLabel="Notes"
          />

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
                onPress={() => {
                  const everyone = members.map((member) => member.id);
                  setParticipants(everyone);
                  if (splitMode !== "EQUAL") {
                    setSplitValues(splitDefaults(splitMode, everyone, cents));
                  }
                }}
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
                    onPress={() => toggleParticipant(member.id)}
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
              <Text style={s.splitTitle}>{splitTitle}</Text>
              <Text style={s.help} numberOfLines={2}>
                {participants.length
                  ? `Split between ${participants.length} ${participants.length === 1 ? "person" : "people"}`
                  : "Select at least one person"}
                {splitMode === "EQUAL" && perPerson
                  ? ` · ${currency} ${perPerson} each`
                  : ""}
              </Text>
            </View>
          </View>

          {splitMode === "EQUAL" ? (
            <>
              {submitButton}
              <Text style={s.foot}>
                Everyone selected will share this equally.
              </Text>
            </>
          ) : null}

          <Text style={s.label}>Split method</Text>
          <View style={s.splitModeRow} accessibilityRole="radiogroup">
            {(["EQUAL", "EXACT", "PERCENTAGE", "SHARES"] as const).map(
              (mode) => {
                const active = splitMode === mode;
                const disabled = participants.length < 2 && mode !== "EQUAL";
                return (
                  <Pressable
                    key={mode}
                    testID={`expense-split-${mode.toLowerCase()}`}
                    onPress={() => !disabled && changeSplitMode(mode)}
                    disabled={disabled}
                    style={[
                      s.splitMode,
                      active && s.splitModeActive,
                      disabled && s.splitModeDisabled,
                    ]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active, disabled }}
                    accessibilityLabel={`${mode.toLowerCase()} split`}
                  >
                    <Text
                      style={[
                        s.splitModeText,
                        active && s.splitModeTextActive,
                        disabled && s.splitModeTextDisabled,
                      ]}
                    >
                      {mode === "PERCENTAGE"
                        ? "%"
                        : mode[0] + mode.slice(1).toLowerCase()}
                    </Text>
                  </Pressable>
                );
              },
            )}
          </View>
          {participants.length < 2 ? (
            <Text style={s.help}>
              Add at least one more participant to use Exact, % or Shares.
            </Text>
          ) : null}

          {splitMode !== "EQUAL" ? (
            <View style={s.splitValues}>
              <Text style={s.splitValuesTitle}>
                {splitMode === "EXACT"
                  ? `Enter each share in ${currency}`
                  : splitMode === "PERCENTAGE"
                    ? "Enter percentages for each person"
                    : "Enter shares for each person"}
              </Text>
              {participants.map((id) => {
                const member = members.find((item) => item.id === id);
                return (
                  <View style={s.splitValueRow} key={id}>
                    <Text style={s.splitValueName} numberOfLines={1}>
                      {id === user?.id ? "You" : member?.name || "Member"}
                    </Text>
                    <View style={s.splitValueInputWrap}>
                      <TextInput
                        testID={`expense-split-value-${id}`}
                        value={splitValues[id] || ""}
                        onChangeText={(value) => {
                          setSplitValues((current) => ({
                            ...current,
                            [id]: value.replace(/[^0-9.,]/g, ""),
                          }));
                          if (error) setError("");
                        }}
                        keyboardType="decimal-pad"
                        placeholder={splitMode === "EXACT" ? "0.00" : "0"}
                        placeholderTextColor={colors.muted}
                        style={s.splitValueInput}
                        accessibilityLabel={`${splitMode.toLowerCase()} for ${member?.name || "member"}`}
                      />
                      <Text style={s.splitValueSuffix}>
                        {splitMode === "EXACT"
                          ? currency
                          : splitMode === "PERCENTAGE"
                            ? "%"
                            : "shares"}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : null}

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

          {splitMode !== "EQUAL" ? (
            <>
              {submitButton}
              <Text style={s.foot}>Review the split above before saving.</Text>
            </>
          ) : null}
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
  chipScrollWrap: { position: "relative" },
  chipScroll: { flexGrow: 0 },
  chipFade: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 28,
    backgroundColor: colors.cream,
    opacity: 0.92,
    // subtle fade: use gradient-like opacity via border
    borderLeftWidth: 0,
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
  inputMultiline: { minHeight: 72, textAlignVertical: "top", paddingTop: 12 },
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
  splitModeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 6,
  },
  splitMode: {
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: 10,
    justifyContent: "center",
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
  },
  splitModeActive: { backgroundColor: colors.teal, borderColor: colors.teal },
  splitModeDisabled: { opacity: 0.45, backgroundColor: colors.sage },
  splitModeText: { color: colors.ink, fontSize: 12, fontWeight: "800" },
  splitModeTextActive: { color: colors.white },
  splitModeTextDisabled: { color: colors.muted },
  splitValues: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 8,
    marginBottom: 8,
  },
  splitValuesTitle: { color: colors.ink, fontSize: 12, fontWeight: "700" },
  splitValueRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  splitValueName: { flex: 1, minWidth: 0, color: colors.ink, fontSize: 13 },
  splitValueInputWrap: {
    width: 138,
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.line,
  },
  splitValueInput: {
    flex: 1,
    color: colors.ink,
    fontSize: 14,
    paddingVertical: 6,
  },
  splitValueSuffix: { color: colors.muted, fontSize: 10, marginLeft: 6 },
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
