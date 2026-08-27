import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { colors } from "../src/theme";
import { useSession } from "../src/session";
export default function Index() {
  const { user, loading } = useSession();
  if (loading)
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.cream,
        }}
      >
        <ActivityIndicator color={colors.teal} />
      </View>
    );
  return <Redirect href={user ? "/(tabs)" : "/login"} />;
}
