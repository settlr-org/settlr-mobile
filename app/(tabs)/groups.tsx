import AntDesign from "@expo/vector-icons/AntDesign";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { apiFetch } from "../../src/api";
import { colors, shadow, type } from "../../src/theme";
type Group = {
  id: string;
  name: string;
  description: string;
  currency: string;
  group_type: string;
};
export default function Groups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      setGroups((await apiFetch<{ data: Group[] }>("/api/v1/groups")).data);
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
  const create = async () => {
    try {
      await apiFetch("/api/v1/groups", {
        method: "POST",
        body: JSON.stringify({ name, description, currency: "NPR" }),
      });
      setShow(false);
      setName("");
      setDescription("");
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
            style={s.add}
            onPress={() => setShow(true)}
            accessibilityLabel="Create group"
          >
            <AntDesign name="plus" size={20} color={colors.white} />
          </Pressable>
        </View>
        {error ? <Text style={s.error}>{error}</Text> : null}
        {loading ? (
          <ActivityIndicator color={colors.teal} />
        ) : (
          groups.map((g, i) => (
            <View style={s.card} key={g.id}>
              <View
                style={[s.icon, i % 2 === 1 && { backgroundColor: "#f8ead4" }]}
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
                <Text style={s.name}>{g.name}</Text>
                <Text style={s.muted} numberOfLines={1}>
                  {g.description || "A shared Settlr ledger"}
                </Text>
              </View>
              <AntDesign name="right" color={colors.muted} size={14} />
            </View>
          ))
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
      <Modal visible={show} transparent animationType="fade">
        <View style={s.backdrop}>
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
        </View>
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
  add: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.teal,
    alignItems: "center",
    justifyContent: "center",
  },
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
    justifyContent: "center",
    padding: 20,
  },
  modal: { backgroundColor: colors.paper, borderRadius: 24, padding: 22 },
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
