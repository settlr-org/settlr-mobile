import AntDesign from "@expo/vector-icons/AntDesign";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiFetch } from "../../src/api";
import { colors, shadow, type } from "../../src/theme";
import { ErrorNotice } from "../../src/ui";
import { money as fmtMoney } from "../../src/types";

type Group = {
  id: string;
  name: string;
  description: string;
  currency: string;
  group_type: string;
};
type OverviewBalance = {
  data: { group_id: string; balance: number; currency: string }[];
};
const money = (amount: number, currency: string) => fmtMoney(amount, currency);

export default function Groups() {
  const { new: createOnOpen } = useLocalSearchParams<{ new?: string }>();
  const [groups, setGroups] = useState<Group[]>([]);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [show, setShow] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [currency, setCurrency] = useState("NPR");
  const [groupType, setGroupType] = useState("OTHER");
  const [information, setInformation] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [modalError, setModalError] = useState("");

  const load = useCallback(async () => {
    try {
      const [groupResponse, balanceResponse] = await Promise.all([
        apiFetch<{ data: Group[] }>("/api/v1/groups"),
        apiFetch<OverviewBalance>("/api/v1/me/balances"),
      ]);
      setGroups(groupResponse.data);
      setBalances(
        Object.fromEntries(
          balanceResponse.data.map((balance) => [
            balance.group_id,
            balance.balance,
          ]),
        ),
      );
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load groups.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );
  useEffect(() => {
    if (createOnOpen === "1") setShow(true);
  }, [createOnOpen]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load();
  }, [load]);

  const create = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setModalError("Group name is required.");
      return;
    }
    if (currency.trim().length !== 3) {
      setModalError("Use a 3-letter currency like NPR or USD.");
      return;
    }
    if (creating) return;
    setCreating(true);
    setModalError("");
    try {
      await apiFetch("/api/v1/groups", {
        method: "POST",
        body: JSON.stringify({
          name: trimmed,
          description: description.trim(),
          currency: currency.toUpperCase().trim(),
          group_type: groupType,
          information: information.trim() || undefined,
        }),
      });
      setShow(false);
      setName("");
      setDescription("");
      setCurrency("NPR");
      setGroupType("OTHER");
      setInformation("");
      await load();
    } catch (e) {
      setModalError(e instanceof Error ? e.message : "Could not create group.");
    } finally {
      setCreating(false);
    }
  };

  const isCreateDisabled =
    !name.trim() || currency.trim().length !== 3 || creating;

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.teal}
          />
        }
        contentContainerStyle={s.page}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.header}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.eyebrow}>SHARED LEDGERS</Text>
            <Text style={s.title}>Your groups</Text>
            <Text style={s.subtle}>
              {groups.length} {groups.length === 1 ? "ledger" : "ledgers"} ·
              Balances explain who owes whom
            </Text>
          </View>
          <Pressable
            testID="groups-create"
            style={({ pressed }) => [
              s.createGroup,
              pressed && { opacity: 0.92 },
            ]}
            onPress={() => {
              setModalError("");
              setShow(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Create group"
            hitSlop={6}
          >
            <AntDesign name="plus" size={14} color={colors.white} />
            <Text style={s.createGroupText}>New group</Text>
          </Pressable>
        </View>

        {error ? (
          <ErrorNotice message={error} retry={() => void load()} />
        ) : null}

        {loading ? (
          <View style={s.loadingWrap}>
            <ActivityIndicator color={colors.teal} />
            <Text style={s.muted}>Loading groups…</Text>
          </View>
        ) : (
          groups.map((g, i) => {
            const balance = balances[g.id] || 0;
            const isPositive = balance > 0;
            const isNegative = balance < 0;
            const label = isPositive
              ? "YOU ARE OWED"
              : isNegative
                ? "YOU OWE"
                : "SETTLED";
            const isAlt = i % 2 === 1;
            return (
              <Pressable
                key={g.id}
                style={({ pressed }) => [s.card, pressed && s.cardPressed]}
                onPress={() => router.push(`/groups/${g.id}`)}
                accessibilityRole="button"
                accessibilityLabel={`${g.name}, ${label} ${money(Math.abs(balance), g.currency)}`}
              >
                <View style={[s.icon, isAlt && s.iconAlt]}>
                  <AntDesign
                    name={g.group_type === "TRIP" ? "environment" : "team"}
                    size={20}
                    color={isAlt ? colors.gold : colors.teal}
                  />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.kind} numberOfLines={1}>
                    {(g.group_type || "GROUP").toUpperCase()} · {g.currency}
                  </Text>
                  <Text style={s.name} numberOfLines={1} ellipsizeMode="tail">
                    {g.name}
                  </Text>
                  <Text style={s.desc} numberOfLines={2} ellipsizeMode="tail">
                    {g.description ||
                      "Shared expenses, balances, and repayments."}
                  </Text>
                </View>
                <View style={s.balance}>
                  <Text
                    style={[
                      s.balanceLabel,
                      isNegative && s.balanceLabelNegative,
                    ]}
                  >
                    {label}
                  </Text>
                  <Text
                    style={[
                      s.balanceAmount,
                      isNegative && s.balanceNegative,
                      isPositive && s.balancePositive,
                    ]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {isNegative || isPositive
                      ? money(Math.abs(balance), g.currency)
                      : "—"}
                  </Text>
                  <Text style={s.balanceHelp} numberOfLines={1}>
                    {isPositive
                      ? "Others owe you"
                      : isNegative
                        ? "You owe others"
                        : "No balance"}
                  </Text>
                </View>
              </Pressable>
            );
          })
        )}

        {!loading && !groups.length ? (
          <View style={s.empty}>
            <View style={s.emptyIcon}>
              <AntDesign name="team" color={colors.teal} size={24} />
            </View>
            <Text style={s.emptyTitle}>Create your first group</Text>
            <Text style={s.emptyText}>
              Start a ledger for a home, trip, or any shared expense. Then add
              members and record your first expense.
            </Text>
            <Pressable
              style={s.emptyCta}
              onPress={() => setShow(true)}
              accessibilityRole="button"
            >
              <Text style={s.emptyCtaText}>New group</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      <Modal
        visible={show}
        transparent
        animationType="fade"
        onRequestClose={() => !creating && setShow(false)}
        statusBarTranslucent
      >
        <KeyboardAvoidingView
          style={s.backdrop}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Pressable
            style={s.backdropPress}
            onPress={() => !creating && setShow(false)}
          />
          <ScrollView
            contentContainerStyle={s.modalScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={s.modal}>
              <View style={s.modalHead}>
                <View>
                  <Text style={s.eyebrow}>NEW LEDGER</Text>
                  <Text style={s.modalTitle}>New group</Text>
                </View>
                <Pressable
                  testID="group-close"
                  onPress={() => !creating && setShow(false)}
                  hitSlop={12}
                  style={s.closeBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                >
                  <AntDesign name="close" size={18} color={colors.ink} />
                </Pressable>
              </View>

              <View style={s.field}>
                <Text style={s.label}>Group name *</Text>
                <TextInput
                  testID="group-name"
                  value={name}
                  onChangeText={(v) => {
                    setName(v);
                    if (modalError) setModalError("");
                  }}
                  placeholder="Weekend trip, Flat 3B…"
                  placeholderTextColor={colors.muted}
                  style={[
                    s.input,
                    !name.trim() && name.length > 0 ? s.inputError : null,
                  ]}
                  returnKeyType="next"
                  accessibilityLabel="Group name"
                />
              </View>

              <View style={s.field}>
                <Text style={s.label}>Currency</Text>
                <TextInput
                  value={currency}
                  onChangeText={(v) => {
                    setCurrency(v.toUpperCase().slice(0, 3));
                    if (modalError) setModalError("");
                  }}
                  placeholder="NPR"
                  placeholderTextColor={colors.muted}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={3}
                  style={[
                    s.input,
                    currency.length !== 3 && currency.length > 0
                      ? s.inputError
                      : null,
                  ]}
                  accessibilityLabel="Currency"
                />
                <Text style={s.help}>
                  3-letter code. Example: NPR, USD, EUR.
                </Text>
              </View>

              <Text style={s.label}>Group type</Text>
              <View style={s.typeRow}>
                {["HOME", "TRIP", "COUPLE", "EVENT", "OTHER"].map((item) => {
                  const active = groupType === item;
                  return (
                    <Pressable
                      key={item}
                      testID={`group-type-${item.toLowerCase()}`}
                      onPress={() => setGroupType(item)}
                      style={[s.typeChip, active && s.typeChipActive]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      accessibilityLabel={item}
                    >
                      <Text style={[s.typeText, active && s.typeTextActive]}>
                        {item}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={s.field}>
                <Text style={s.label}>Description (optional)</Text>
                <TextInput
                  testID="group-description"
                  value={description}
                  onChangeText={setDescription}
                  placeholder="What is this ledger for?"
                  placeholderTextColor={colors.muted}
                  style={[s.input, s.inputMultiline]}
                  multiline
                  numberOfLines={3}
                  accessibilityLabel="Description"
                />
              </View>

              <View style={s.field}>
                <Text style={s.label}>House rules / Info (optional)</Text>
                <TextInput
                  testID="group-information"
                  value={information}
                  onChangeText={setInformation}
                  placeholder="House rules, settlement info, etc."
                  placeholderTextColor={colors.muted}
                  style={[s.input, s.inputMultiline]}
                  multiline
                  numberOfLines={2}
                  accessibilityLabel="Group information"
                />
              </View>

              {modalError ? <ErrorNotice message={modalError} /> : null}

              <Pressable
                testID="group-submit"
                style={({ pressed }) => [
                  s.cta,
                  isCreateDisabled && s.ctaDisabled,
                  pressed && !isCreateDisabled && s.ctaPressed,
                ]}
                onPress={create}
                disabled={isCreateDisabled}
                accessibilityRole="button"
                accessibilityState={{ disabled: isCreateDisabled }}
              >
                <Text
                  style={[s.ctaText, isCreateDisabled && s.ctaTextDisabled]}
                >
                  {creating ? "Creating…" : "Create group"}
                </Text>
                {!creating ? (
                  <AntDesign
                    name="arrow-right"
                    size={14}
                    color={isCreateDisabled ? colors.muted : colors.white}
                  />
                ) : null}
              </Pressable>
              <Text style={s.modalFoot}>
                You can add members after creating.
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  page: { padding: 16, paddingBottom: 110, gap: 12 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 4,
  },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 1.6,
    color: colors.teal,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  title: {
    fontFamily: type.title,
    fontSize: 26,
    color: colors.ink,
    marginTop: 4,
    lineHeight: 30,
  },
  subtle: { color: colors.muted, fontSize: 12, lineHeight: 16, marginTop: 6 },
  muted: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 16,
    textAlign: "center",
  },
  loadingWrap: { paddingVertical: 32, alignItems: "center", gap: 10 },
  createGroup: {
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.teal,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 4,
  },
  createGroupText: { color: colors.white, fontSize: 12, fontWeight: "800" },
  card: {
    backgroundColor: colors.paper,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    minHeight: 88,
    ...shadow,
  },
  cardPressed: { opacity: 0.96, transform: [{ scale: 0.99 }] },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: colors.sage,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  iconAlt: { backgroundColor: colors.altGoldBg },
  kind: {
    fontSize: 10,
    letterSpacing: 1,
    color: colors.teal,
    fontWeight: "800",
  },
  name: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.ink,
    marginTop: 3,
    lineHeight: 18,
  },
  desc: { fontSize: 11, color: colors.muted, marginTop: 2, lineHeight: 15 },
  balance: {
    alignItems: "flex-end",
    minWidth: 84,
    maxWidth: 110,
    flexShrink: 0,
    gap: 2,
  },
  balanceLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  balanceLabelNegative: { color: colors.coral },
  balanceAmount: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "800",
    marginTop: 1,
  },
  balancePositive: { color: colors.teal },
  balanceNegative: { color: colors.coral },
  balanceHelp: { color: colors.muted, fontSize: 10, lineHeight: 12 },
  empty: {
    backgroundColor: colors.paper,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: colors.line,
    marginTop: 8,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.sage,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontFamily: type.title,
    fontSize: 20,
    color: colors.ink,
    marginTop: 6,
    textAlign: "center",
  },
  emptyText: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
    paddingHorizontal: 12,
  },
  emptyCta: {
    marginTop: 6,
    backgroundColor: colors.teal,
    paddingHorizontal: 18,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCtaText: { color: colors.white, fontWeight: "800", fontSize: 12 },
  backdrop: {
    flex: 1,
    backgroundColor: colors.backdrop,
    justifyContent: "center",
  },
  backdropPress: { ...StyleSheet.absoluteFill },
  modalScroll: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 16,
  },
  modal: {
    backgroundColor: colors.paper,
    borderRadius: 22,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  modalHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.sage,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontFamily: type.title,
    fontSize: 22,
    color: colors.ink,
    marginTop: 2,
    lineHeight: 26,
  },
  field: { gap: 6 },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.ink,
    letterSpacing: 0.2,
  },
  help: { fontSize: 10, color: colors.muted, lineHeight: 13, marginTop: 2 },
  input: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.ink,
    fontSize: 14,
    minHeight: 44,
  },
  inputMultiline: { minHeight: 72, textAlignVertical: "top", paddingTop: 12 },
  inputError: { borderColor: colors.coral },
  typeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeChip: {
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: colors.paper,
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  typeChipActive: { backgroundColor: colors.teal, borderColor: colors.teal },
  typeText: { color: colors.ink, fontSize: 11, fontWeight: "700" },
  typeTextActive: { color: colors.white },
  cta: {
    backgroundColor: colors.teal,
    borderRadius: 12,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  ctaDisabled: {
    backgroundColor: colors.sage,
    borderColor: colors.line,
    borderWidth: 1,
    opacity: 0.9,
  },
  ctaPressed: { opacity: 0.88 },
  ctaText: { color: colors.white, fontWeight: "800", fontSize: 13 },
  ctaTextDisabled: { color: colors.muted },
  modalFoot: {
    fontSize: 10,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 13,
  },
});
