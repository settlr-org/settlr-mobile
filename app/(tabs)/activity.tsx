import AntDesign from "@expo/vector-icons/AntDesign";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { apiFetch } from "../../src/api";
import { colors, type } from "../../src/theme";
type Event = {
  id: string;
  type: string;
  created_at: string;
  payload?: { description?: string };
};
export default function Activity() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      setEvents(
        (await apiFetch<{ data: Event[] }>("/api/v1/activity?limit=50")).data,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load activity.");
    } finally {
      setLoading(false);
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );
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
        <Text style={s.eyebrow}>HISTORY</Text>
        <Text style={s.title}>Activity</Text>
        <Text style={s.muted}>Everything your groups have shared</Text>
        {error ? <Text style={s.error}>{error}</Text> : null}
        {loading ? (
          <ActivityIndicator style={{ marginTop: 30 }} color={colors.teal} />
        ) : (
          events.map((e) => (
            <View style={s.item} key={e.id}>
              <View style={s.icon}>
                <AntDesign name="notification" size={17} color={colors.teal} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>
                  {e.payload?.description ||
                    e.type.toLowerCase().replaceAll("_", " ")}
                </Text>
                <Text style={s.muted}>
                  {e.type.toLowerCase().replaceAll("_", " ")} ·{" "}
                  {new Date(e.created_at).toLocaleDateString()}
                </Text>
              </View>
            </View>
          ))
        )}
        {!loading && !events.length ? (
          <View style={s.empty}>
            <AntDesign name="profile" size={28} color={colors.teal} />
            <Text style={s.name}>No activity yet</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  page: { padding: 20, paddingBottom: 110 },
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
  muted: {
    color: colors.muted,
    fontSize: 10,
    marginTop: 5,
    textTransform: "capitalize",
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: colors.sage,
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    fontWeight: "800",
    fontSize: 12,
    color: colors.ink,
    textTransform: "capitalize",
  },
  error: { color: colors.coral, fontSize: 11, marginTop: 14 },
  empty: {
    backgroundColor: colors.paper,
    borderRadius: 18,
    padding: 35,
    alignItems: "center",
    gap: 12,
    marginTop: 24,
  },
});
