import AntDesign from "@expo/vector-icons/AntDesign";
import { router } from "expo-router";
import { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSession } from "../src/session";
import { GoogleSignIn, googleOAuthEnabled } from "../src/GoogleSignIn";
import { colors, shadow, type } from "../src/theme";

export default function Login() {
  const emailInput = useRef<TextInput>(null);
  const passwordInput = useRef<TextInput>(null);
  const { signIn, signInWithGoogle } = useSession();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [verificationEmail, setVerificationEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      const result = await signIn(mode, { name, email, password });
      if ("verification_required" in result) {
        setVerificationEmail(result.email);
        return;
      }
      router.replace("/(tabs)");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  };
  const googleSignIn = async (idToken: string) => {
    setBusy(true);
    setError("");
    try {
      await signInWithGoogle(idToken);
      router.replace("/(tabs)");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Google sign-in could not be completed.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={s.center}
      >
        <View style={s.logo}>
          <AntDesign name="wallet" size={25} color={colors.white} />
        </View>
        <Text style={s.brand}>Settlr</Text>
        <Text style={s.tagline}>Shared money, made clear.</Text>
        <View style={s.card}>
          <Text style={s.eyebrow}>WELCOME</Text>
          <Text style={s.title}>
            {verificationEmail
              ? "Verify your email"
              : mode === "login"
                ? "Good to see you"
                : "Create your account"}
          </Text>
          {verificationEmail ? (
            <>
              <Text style={s.verifyText}>
                We sent a verification link to {verificationEmail}. Open it,
                then return here to sign in.
              </Text>
              <Pressable
                testID="auth-back-to-login"
                onPress={() => {
                  setVerificationEmail("");
                  setMode("login");
                  setPassword("");
                }}
              >
                <Text style={s.switch}>Back to login</Text>
              </Pressable>
            </>
          ) : (
            <>
              <GoogleSignIn
                busy={busy}
                onToken={(token) => void googleSignIn(token)}
                onError={setError}
              />
              {googleOAuthEnabled ? (
                <View style={s.divider}>
                  <View style={s.dividerLine} />
                  <Text style={s.dividerText}>or continue with email</Text>
                  <View style={s.dividerLine} />
                </View>
              ) : null}
              {mode === "register" && (
                <TextInput
                  testID="register-name"
                  value={name}
                  onChangeText={setName}
                  placeholder="Your name"
                  placeholderTextColor={colors.muted}
                  style={s.input}
                  autoCapitalize="words"
                  returnKeyType="next"
                  onSubmitEditing={() => emailInput.current?.focus()}
                />
              )}
              <TextInput
                testID="auth-email"
                value={email}
                onChangeText={setEmail}
                placeholder="Email address"
                placeholderTextColor={colors.muted}
                style={s.input}
                autoCapitalize="none"
                keyboardType="email-address"
                returnKeyType="next"
                onSubmitEditing={() => passwordInput.current?.focus()}
                ref={emailInput}
              />
              <TextInput
                testID="auth-password"
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                placeholderTextColor={colors.muted}
                style={s.input}
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={() => void submit()}
                ref={passwordInput}
              />
              {error ? <Text style={s.error}>{error}</Text> : null}
              <Pressable
                testID="auth-submit"
                style={({ pressed }) => [
                  s.button,
                  pressed && { opacity: 0.82 },
                ]}
                onPress={submit}
                disabled={busy}
              >
                <Text style={s.buttonText}>
                  {busy
                    ? "Please wait…"
                    : mode === "login"
                      ? "Sign in"
                      : "Create account"}
                </Text>
              </Pressable>
              <Pressable
                testID="auth-mode-switch"
                onPress={() => setMode(mode === "login" ? "register" : "login")}
              >
                <Text style={s.switch}>
                  {mode === "login"
                    ? "New to Settlr? Create an account"
                    : "Already registered? Sign in"}
                </Text>
              </Pressable>
              {mode === "login" ? (
                <Pressable onPress={() => router.push("/forgot-password")}>
                  <Text style={s.switch}>Forgot your password?</Text>
                </Pressable>
              ) : null}
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  center: { flex: 1, justifyContent: "center", padding: 24 },
  logo: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: colors.teal,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
  },
  brand: {
    fontFamily: type.title,
    fontSize: 36,
    color: colors.ink,
    textAlign: "center",
    marginTop: 10,
  },
  tagline: {
    color: colors.muted,
    textAlign: "center",
    fontSize: 12,
    marginBottom: 28,
  },
  card: {
    backgroundColor: colors.paper,
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow,
  },
  eyebrow: {
    fontSize: 9,
    letterSpacing: 2,
    color: colors.teal,
    fontWeight: "800",
  },
  title: {
    fontFamily: type.title,
    fontSize: 28,
    color: colors.ink,
    marginTop: 5,
    marginBottom: 19,
  },
  input: {
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 13,
    padding: 15,
    color: colors.ink,
    marginBottom: 11,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.line },
  dividerText: { fontSize: 10, color: colors.muted },
  button: {
    backgroundColor: colors.teal,
    borderRadius: 13,
    padding: 16,
    alignItems: "center",
    marginTop: 3,
  },
  buttonText: { color: colors.white, fontWeight: "800" },
  switch: {
    color: colors.teal,
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 18,
  },
  error: { color: colors.coral, fontSize: 11, marginBottom: 8 },
  verifyText: { color: colors.muted, fontSize: 13, lineHeight: 20 },
});
