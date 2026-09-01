import { Tabs, router, usePathname } from "expo-router";
import AntDesign from "@expo/vector-icons/AntDesign";
import { useCallback, useEffect, useState } from "react";
import { AppState, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiFetch } from "../../src/api";
import { useSession } from "../../src/session";
import { colors } from "../../src/theme";

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { user } = useSession();
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);
  const fetchUnread = useCallback(async () => {
    if (!user) return;
    try {
      const data = await apiFetch<{ unread_count: number }>(
        "/api/v1/notifications?limit=1",
      );
      setUnread(data.unread_count ?? 0);
    } catch {}
  }, [user]);
  useEffect(() => {
    void fetchUnread();
    const id = setInterval(fetchUnread, 30000);
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void fetchUnread();
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [fetchUnread, pathname]);
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.teal,
          tabBarInactiveTintColor: colors.muted,
          tabBarStyle: {
            height: 76 + insets.bottom,
            paddingTop: 8,
            paddingBottom: 12 + insets.bottom,
            backgroundColor: colors.paper,
            borderTopWidth: 1,
            borderTopColor: colors.line,
          },
          tabBarItemStyle: { paddingVertical: 4 },
          tabBarLabelStyle: { fontSize: 10, fontWeight: "700", marginTop: 2 },
          tabBarIconStyle: { marginBottom: -2 },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color }) => (
              <AntDesign name="home" color={color} size={22} />
            ),
          }}
        />
        <Tabs.Screen
          name="groups"
          options={{
            title: "Groups",
            tabBarIcon: ({ color }) => (
              <AntDesign name="team" color={color} size={22} />
            ),
          }}
        />
        <Tabs.Screen
          name="personal"
          options={{
            title: "Personal",
            tabBarIcon: ({ color }) => (
              <AntDesign name="pie-chart" color={color} size={22} />
            ),
          }}
        />
        <Tabs.Screen
          name="more"
          options={{
            title: "More",
            tabBarIcon: ({ color }) => (
              <View style={{ position: "relative" }}>
                <AntDesign name="appstore" color={color} size={22} />
                {unread > 0 ? (
                  <View
                    style={{
                      position: "absolute",
                      top: -2,
                      right: -6,
                      width: 9,
                      height: 9,
                      borderRadius: 5,
                      backgroundColor: colors.badge,
                      borderWidth: 2,
                      borderColor: colors.paper,
                    }}
                  />
                ) : null}
              </View>
            ),
            tabBarBadge: unread > 0 ? "" : undefined,
            tabBarBadgeStyle: {
              backgroundColor: colors.badge,
              minWidth: 9,
              minHeight: 9,
              maxWidth: 9,
              maxHeight: 9,
              borderRadius: 5,
              marginLeft: -6,
            },
          }}
        />
        {/* Friends / Activity are first-class on web; on mobile they are accessible via the More hub and direct links, keeping the 4-tab bar uncluttered (see app/(tabs)/more.tsx) */}
        <Tabs.Screen
          name="friends"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="activity"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="account"
          options={{
            href: null,
          }}
        />
      </Tabs>
      <Pressable
        onPress={() => router.push("/add")}
        accessibilityRole="button"
        accessibilityLabel="Add expense"
        accessibilityHint="Create a new shared or personal expense"
        hitSlop={8}
        style={({ pressed }) => ({
          position: "absolute",
          bottom: 86 + insets.bottom,
          right: 16,
          width: 56,
          height: 56,
          borderRadius: 18,
          backgroundColor: colors.teal,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: colors.ink,
          shadowOpacity: pressed ? 0.12 : 0.15,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 4,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.12)",
          opacity: pressed ? 0.96 : 1,
        })}
      >
        <AntDesign name="plus" size={22} color={colors.white} />
      </Pressable>
    </View>
  );
}
