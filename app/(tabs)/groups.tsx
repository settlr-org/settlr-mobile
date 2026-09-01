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
const money = (amount: number, currency: string) =>
  new Intl.NumberFormat("en-NP", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount / 100);
export default function Groups() {
  const { new: createOnOpen } = useLocalSearchParams<{ new?: string }>();
  const [groups, setGroups] = useState<Group[]>([]);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [currency, setCurrency] = useState("NPR");
  const [groupType, setGroupType] = useState("OTHER");
  const [error, setError] = useState("");
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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load groups.");
    } finally {
      setLoading(false);
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
  const create = async () => {
    try {
      await apiFetch("/api/v1/groups", {
        method: "POST",
        body: JSON.stringify({
          name,
          description,
          currency: currency.toUpperCase(),
          group_type: groupType,
        }),
      });
      setShow(false);
      setName("");
      setDescription("");
      setCurrency("NPR");
      setGroupType("OTHER");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create group.");
    }
  };
  return (
    <SafeAreaView style={s.safe}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={load}
            tintColor={colors.teal}
          />
        }
        contentContainerStyle={s.page}
      >
        <View style={s.header}>
          <View>
            <Text style={s.eyebrow}>SHARED LEDGERS</Text>
            <Text style={s.title}>Your groups</Text>
            <Text style={s.muted}>{groups.length} active</Text>
          </View>
          <Pressable
            testID="groups-create"
            style={s.createGroup}
            onPress={() => setShow(true)}
            accessibilityLabel="Create group"
          >
            <AntDesign name="plus" size={14} color={colors.teal} />
            <Text style={s.createGroupText}>New group</Text>
          </Pressable>
        </View>
        {error ? <Text style={s.error}>{error}</Text> : null}
        {loading ? (
          <ActivityIndicator color={colors.teal} />
        ) : (
          groups.map((g, i) => {
            const balance = balances[g.id] || 0;
            return (
              <Pressable
                style={s.card}
                key={g.id}
                onPress={() => router.push(`/groups/${g.id}`)}
              >
                <View
                  style={[
                    s.icon,
                    i % 2 === 1 && { backgroundColor: "#f8ead4" },
                  ]}
                >
                  <AntDesign
                    name={g.group_type === "TRIP" ? "environment" : "appstore"}
                    size={21}
                    color={i % 2 === 1 ? colors.gold : colors.teal}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.kind}>
                    {g.group_type || "GROUP"} · {g.currency}
                  </Text>
                  <Text style={s.name} numberOfLines={1}>
                    {g.name}
                  </Text>
                  <Text style={s.muted} numberOfLines={1}>
                    {g.description || "A shared Settlr ledger"}
                  </Text>
                </View>
                <View style={s.balance}>
                  <Text style={s.balanceLabel}>
                    {balance > 0
                      ? "YOU GET"
                      : balance < 0
                        ? "YOU OWE"
                        : "SETTLED"}
                  </Text>
                  <Text
                    style={[s.balanceAmount, balance < 0 && s.balanceNegative]}
                  >
                    {money(Math.abs(balance), g.currency)}
                  </Text>
                </View>
              </Pressable>
            );
          })
        )}
        {!loading && !groups.length ? (
          <View style={s.empty}>
            <AntDesign name="team" color={colors.teal} size={30} />
            <Text style={s.emptyTitle}>Create your first group</Text>
            <Text style={s.muted}>
              Start a ledger for a home, trip, or any shared expense.
            </Text>
          </View>
        ) : null}
      </ScrollView>
      <Modal
        visible={show}
        transparent
        animationType="fade"
        onRequestClose={() => setShow(false)}
      >
        <KeyboardAvoidingView
          style={s.backdrop}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            contentContainerStyle={s.modalScroll}
            keyboardShouldPersistTaps="handled"
          >
            <View style={s.modal}>
              <View style={s.modalHead}>
                <Text style={s.modalTitle}>New group</Text>
                <Pressable onPress={() => setShow(false)}>
                  <AntDesign name="close" size={20} color={colors.muted} />
                </Pressable>
              </View>
              <TextInput
                testID="group-name"
                value={name}
                onChangeText={setName}
                placeholder="Group name"
                placeholderTextColor={colors.muted}
                style={s.input}
              />
              <TextInput
                value={currency}
                onChangeText={setCurrency}
                placeholder="Currency (e.g. NPR)"
                placeholderTextColor={colors.muted}
                autoCapitalize="characters"
                maxLength={3}
                style={s.input}
              />
              <View style={s.typeRow}>
                {["HOME", "TRIP", "COUPLE", "EVENT", "OTHER"].map((item) => (
                  <Pressable
                    key={item}
                    onPress={() => setGroupType(item)}
                    style={[s.typeChip, groupType === item && s.typeChipActive]}
                  >
                    <Text
                      style={[
                        s.typeText,
                        groupType === item && s.typeTextActive,
                      ]}
                    >
                      {item}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <TextInput
                testID="group-description"
                value={description}
                onChangeText={setDescription}
                placeholder="Description (optional)"
                placeholderTextColor={colors.muted}
                style={s.input}
              />
              <Pressable
                testID="group-submit"
                style={s.cta}
                onPress={create}
                disabled={!name.trim()}
              >
                <Text style={s.ctaText}>Create group</Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  page: { padding: 18, paddingBottom: 110 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  eyebrow: {
    fontSize: 9,
    letterSpacing: 2,
    color: colors.teal,
    fontWeight: "800",
  },
  title: {
    fontFamily: type.title,
    fontSize: 32,
    color: colors.ink,
    marginTop: 3,
  },
  muted: { color: colors.muted, fontSize: 10, marginTop: 4 },
  createGroup: {
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.teal,
    backgroundColor: colors.paper,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  createGroupText: { color: colors.teal, fontSize: 10, fontWeight: "800" },
  card: {
    backgroundColor: colors.paper,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 15,
    marginBottom: 10,
    flexDirection: "row",
    gap: 13,
    alignItems: "center",
    ...shadow,
  },
  balance: { alignItems: "flex-end", minWidth: 68 },
  balanceLabel: {
    color: colors.muted,
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.7,
  },
  balanceAmount: {
    color: colors.teal,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 3,
  },
  balanceNegative: { color: colors.coral },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.sage,
    alignItems: "center",
    justifyContent: "center",
  },
  kind: {
    fontSize: 8,
    letterSpacing: 1.3,
    color: colors.teal,
    fontWeight: "800",
  },
  name: { fontSize: 14, fontWeight: "800", color: colors.ink, marginTop: 3 },
  error: { color: colors.coral, fontSize: 11, marginBottom: 12 },
  empty: {
    backgroundColor: colors.paper,
    borderRadius: 20,
    padding: 35,
    alignItems: "center",
    gap: 7,
  },
  emptyTitle: {
    fontFamily: type.title,
    fontSize: 22,
    color: colors.ink,
    marginTop: 7,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(8,20,16,.6)",
  },
  modalScroll: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  modal: { backgroundColor: colors.paper, borderRadius: 24, padding: 22 },
  typeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  typeChip: {
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  typeChipActive: { backgroundColor: colors.teal, borderColor: colors.teal },
  typeText: { color: colors.ink, fontSize: 9, fontWeight: "800" },
  typeTextActive: { color: colors.white },
  modalHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  modalTitle: { fontFamily: type.title, fontSize: 26, color: colors.ink },
  input: {
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 13,
    padding: 15,
    color: colors.ink,
    marginBottom: 11,
  },
  cta: {
    backgroundColor: colors.teal,
    borderRadius: 13,
    padding: 16,
    alignItems: "center",
    marginTop: 3,
  },
  ctaText: { color: colors.white, fontWeight: "800" },
});
