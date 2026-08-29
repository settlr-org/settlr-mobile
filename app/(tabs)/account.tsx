import AntDesign from "@expo/vector-icons/AntDesign";
import { router } from "expo-router";
import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { useSession } from "../../src/session";
import { colors, shadow, type } from "../../src/theme";
import { initials } from "../../src/utils/initials";
export default function Account() {
  const { user, signOut } = useSession();
  const leave = async () => {
    await signOut();
    router.replace("/login");
  };
  return (
    <SafeAreaView style={s.safe}>
      <View style={s.page}>
        <Text style={s.eyebrow}>SETTINGS</Text>
        <Text style={s.title}>Your account</Text>
        <View style={s.profile}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initials(user?.name || "You")}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.name}>{user?.name || "Settlr user"}</Text>
            <Text style={s.muted}>{user?.email}</Text>
          </View>
          <AntDesign name="check-circle" size={18} color={colors.teal} />
        </View>
        <View style={s.menu}>
          <Row
            icon="wallet"
            title="Currency"
            value={user?.default_currency || "NPR"}
          />
          <Row icon="bell" title="Notifications" value="Enabled" />
          <Row icon="lock" title="Security" value="Secure session" />
          <Row icon="questioncircleo" title="Help" value="Settlr support" />
        </View>
        <Pressable style={s.logout} onPress={leave}>
          <AntDesign name="logout" size={18} color={colors.coral} />
          <Text style={s.logoutText}>Sign out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
function Row({
  icon,
  title,
  value,
}: {
  icon: string;
  title: string;
  value: string;
}) {
  return (
    <View style={s.row}>
      <AntDesign name={icon as never} size={18} color={colors.teal} />
      <View style={{ flex: 1 }}>
        <Text style={s.rowTitle}>{title}</Text>
        <Text style={s.muted}>{value}</Text>
      </View>
      <AntDesign name="right" size={13} color={colors.muted} />
    </View>
  );
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  page: { padding: 20 },
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
    marginBottom: 22,
  },
  profile: {
    backgroundColor: colors.paper,
    borderRadius: 20,
    padding: 17,
    flexDirection: "row",
    gap: 13,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: colors.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.white, fontSize: 15, fontWeight: "800" },
  name: { fontSize: 14, fontWeight: "800", color: colors.ink },
  muted: { color: colors.muted, fontSize: 10, marginTop: 4 },
  menu: {
    backgroundColor: colors.paper,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: "hidden",
  },
  row: {
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  rowTitle: { fontSize: 12, fontWeight: "800", color: colors.ink },
  logout: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#e8c4c5",
    borderRadius: 15,
    padding: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 9,
  },
  logoutText: { color: colors.coral, fontWeight: "800", fontSize: 12 },
});
