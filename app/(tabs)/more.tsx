import AntDesign from "@expo/vector-icons/AntDesign";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { apiFetch } from "../../src/api";
import { colors } from "../../src/theme";
import { Card, ErrorNotice, PageTitle, Screen } from "../../src/ui";
import type { Notification } from "../../src/types";
import { initials } from "../../src/types";
import { useSession } from "../../src/session";

// Parity with web AppShell navigation: friends/activity are first-class on web,
// on mobile they are accessible via this More hub plus direct deep links /friends /activity /invites.
const items = [
  ["Friends", "contacts", "/friends"],
  ["Activity", "bars", "/activity"],
  ["Invites", "mail", "/invites"],
  ["Search", "search1", "/search"],
  ["Notifications", "bells", "/notifications"],
  ["Settings", "setting", "/settings"],
] as const;

export default function More() {
  const { user } = useSession();
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      const response = await apiFetch<{
        data: Notification[];
        unread_count: number;
      }>("/api/v1/notifications?limit=1");
      setUnread(response.unread_count);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not load notification status.",
      );
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );
  return (
    <Screen>
      <PageTitle
        eyebrow="WORKSPACE"
        title="More"
        description="Everything else in your Settlr workspace."
      />
      {error ? <ErrorNotice message={error} retry={() => void load()} /> : null}
      <Card>
        <Pressable style={s.profile} onPress={() => router.push("/settings")}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initials(user?.name)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.name}>{user?.name || "Settlr user"}</Text>
            <Text style={s.email}>{user?.email}</Text>
          </View>
          <AntDesign name="right" color={colors.muted} size={14} />
        </Pressable>
      </Card>
      <Card>
        {items.map(([label, icon, href]) => (
          <Pressable key={href} style={s.row} onPress={() => router.push(href)}>
            <View style={s.icon}>
              <AntDesign name={icon as never} size={18} color={colors.teal} />
            </View>
            <Text style={s.label}>{label}</Text>
            {label === "Notifications" && unread ? (
              <View style={s.badge}>
                <Text style={s.badgeText}>{unread}</Text>
              </View>
            ) : null}
            <AntDesign name="right" color={colors.muted} size={13} />
          </Pressable>
        ))}
      </Card>
    </Screen>
  );
}
const s = StyleSheet.create({
  profile: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    height: 48,
    width: 48,
    borderRadius: 16,
    backgroundColor: colors.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.white, fontWeight: "800" },
  name: { color: colors.ink, fontWeight: "800", fontSize: 14 },
  email: { color: colors.muted, fontSize: 11, marginTop: 3 },
  row: {
    minHeight: 53,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    borderBottomWidth: 1,
    borderColor: colors.line,
  },
  icon: { width: 32, alignItems: "center" },
  label: { flex: 1, color: colors.ink, fontSize: 13, fontWeight: "700" },
  badge: {
    backgroundColor: colors.teal,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: colors.white, fontSize: 10, fontWeight: "800" },
});
