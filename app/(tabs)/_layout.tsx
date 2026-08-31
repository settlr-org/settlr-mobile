import { Tabs, router } from "expo-router";
import AntDesign from "@expo/vector-icons/AntDesign";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../../src/theme";

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
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
              <AntDesign name="appstore" color={color} size={22} />
            ),
          }}
        />
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
        accessibilityLabel="Add expense"
        style={{
          position: "absolute",
          bottom: 88 + insets.bottom,
          right: 16,
          width: 56,
          height: 56,
          borderRadius: 18,
          backgroundColor: colors.teal,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: colors.ink,
          shadowOpacity: 0.15,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 4,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.12)",
        }}
      >
        <AntDesign name="plus" size={22} color={colors.white} />
      </Pressable>
    </View>
  );
}
