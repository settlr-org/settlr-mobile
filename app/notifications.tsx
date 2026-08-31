import AntDesign from "@expo/vector-icons/AntDesign";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { apiFetch } from "../src/api";
import { colors } from "../src/theme";
import {
  Button,
  Card,
  Empty,
  ErrorNotice,
  Loading,
  PageTitle,
  Screen,
} from "../src/ui";
import type { Notification } from "../src/types";

export default function Notifications() {
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      const response = await apiFetch<{
        data: Notification[];
        unread_count: number;
      }>("/api/v1/notifications?limit=100");
      setItems(response.data);
      setUnread(response.unread_count);
      setError("");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to load notifications.",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );
  const read = async (id?: string) => {
    await apiFetch(
      id
        ? `/api/v1/notifications/${id}/read`
        : "/api/v1/notifications/read-all",
      { method: "POST" },
    );
    await load();
  };
  return (
    <Screen>
      <PageTitle
        eyebrow="INBOX"
        title="Notifications"
        description="Invites, expenses, settlements, and requests."
        action={
          unread ? (
            <Button label="Read all" secondary onPress={() => void read()} />
          ) : undefined
        }
      />
      {error ? <ErrorNotice message={error} retry={() => void load()} /> : null}
      {loading ? (
        <Loading />
      ) : (
        <Card>
          {items.map((item) => (
            <Pressable
              key={item.id}
              style={[s.row, !item.read_at && s.unread]}
              onPress={() => !item.read_at && void read(item.id)}
            >
              <View style={s.icon}>
                <AntDesign
                  name={
                    item.type.includes("FRIEND")
                      ? "team"
                      : item.type.includes("SETTLEMENT")
                        ? "swap"
                        : "dollar"
                  }
                  size={17}
                  color={colors.teal}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.title}>{item.title}</Text>
                <Text style={s.body}>{item.body}</Text>
                <Text style={s.when}>
                  {new Date(item.created_at).toLocaleString()}
                </Text>
              </View>
              {!item.read_at ? <View style={s.dot} /> : null}
            </Pressable>
          ))}
          {!items.length ? (
            <Empty
              icon="bells"
              title="Your inbox is clear"
              text="New updates will appear here."
            />
          ) : null}
        </Card>
      )}
    </Screen>
  );
}
const s = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 11,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: colors.line,
  },
  unread: {
    backgroundColor: "#f1f8f4",
    marginHorizontal: -8,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.sage,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { color: colors.ink, fontSize: 13, fontWeight: "800" },
  body: { color: colors.muted, fontSize: 11, marginTop: 2 },
  when: { color: colors.muted, fontSize: 9, marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.teal },
});
