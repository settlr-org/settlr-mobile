import AntDesign from "@expo/vector-icons/AntDesign";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiFetch } from "../../src/api";
import { colors, type } from "../../src/theme";
type Event = {
  id: string;
  type: string;
  created_at: string;
  payload?: { description?: string };
};
const readableType = (value: string) =>
  value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
const eventIcon = (value: string) => {
  const type = value.toLowerCase();
  if (type.includes("settle") || type.includes("payment")) return "swap";
  if (type.includes("expense")) return "wallet";
  if (type.includes("member") || type.includes("group")) return "team";
  return "notification";
};
const dateLabel = (value: string) => {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString(undefined, { month: "long", day: "numeric" });
};
export default function Activity() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      setEvents(
        (await apiFetch<{ data: Event[] }>("/api/v1/activity?limit=100")).data,
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
  const groupedEvents = events.reduce<Record<string, Event[]>>(
    (groups, event) => {
      const label = dateLabel(event.created_at);
      groups[label] = [...(groups[label] ?? []), event];
      return groups;
    },
    {},
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
          Object.entries(groupedEvents).map(([day, dayEvents]) => (
            <View key={day} style={s.dayGroup}>
              <Text style={s.day}>{day}</Text>
              {dayEvents.map((e) => (
                <View style={s.item} key={e.id}>
                  <View style={s.icon}>
                    <AntDesign
                      name={eventIcon(e.type)}
                      size={17}
                      color={colors.teal}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.name}>
                      {e.payload?.description || readableType(e.type)}
                    </Text>
                    <Text style={s.detail}>{readableType(e.type)}</Text>
                  </View>
                </View>
              ))}
            </View>
          ))
        )}
        {!loading && !events.length ? (
          <View style={s.empty}>
            <AntDesign name="profile" size={28} color={colors.teal} />
            <Text style={s.name}>No activity yet</Text>
            <Text style={s.emptyCopy}>
              Expenses and settlements will appear here.
            </Text>
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
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  dayGroup: { marginTop: 23 },
  day: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.7,
    textTransform: "uppercase",
    marginBottom: 2,
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
  },
  detail: {
    color: colors.muted,
    fontSize: 10,
    marginTop: 4,
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
  emptyCopy: { color: colors.muted, fontSize: 11, textAlign: "center" },
});
