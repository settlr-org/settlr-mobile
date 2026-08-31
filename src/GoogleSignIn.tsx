import AntDesign from "@expo/vector-icons/AntDesign";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { useEffect } from "react";
import { Platform, Pressable, StyleSheet, Text } from "react-native";

import { colors } from "./theme";

WebBrowser.maybeCompleteAuthSession();

const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;

export const googleOAuthEnabled = Boolean(
  Platform.select({
    ios: iosClientId,
    android: androidClientId,
    default: webClientId,
  }),
);

function GoogleButton({ onToken, onError, busy }: GoogleButtonProps) {
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId,
    iosClientId,
    androidClientId,
    selectAccount: true,
  });
  useEffect(() => {
    if (response?.type === "success") {
      const idToken = response.params.id_token;
      if (idToken) onToken(idToken);
      else onError("Google did not return an identity token. Try again.");
    }
    if (response?.type === "error")
      onError("Google sign-in could not be completed.");
  }, [response, onError, onToken]);
  return (
    <Pressable
      style={({ pressed }) => [styles.button, pressed && { opacity: 0.82 }]}
      onPress={() => void promptAsync()}
      disabled={busy || !request}
    >
      <AntDesign name="google" size={17} color={colors.ink} />
      <Text style={styles.text}>
        {busy ? "Please wait…" : "Continue with Google"}
      </Text>
    </Pressable>
  );
}

type GoogleButtonProps = {
  onToken: (token: string) => void;
  onError: (message: string) => void;
  busy: boolean;
};

export function GoogleSignIn(props: GoogleButtonProps) {
  return googleOAuthEnabled ? <GoogleButton {...props} /> : null;
}

const styles = StyleSheet.create({
  button: {
    borderColor: colors.line,
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    padding: 14,
    marginBottom: 12,
  },
  text: { color: colors.ink, fontSize: 12, fontWeight: "800" },
});
