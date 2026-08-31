import AntDesign from "@expo/vector-icons/AntDesign";
import { router } from "expo-router";
import { useState } from "react";
import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { apiFetch } from "../src/api";
import { useSession } from "../src/session";
import { colors, shadow, type } from "../src/theme";

export default function PasswordSettings() {
  const { user, refresh } = useSession();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await apiFetch("/api/v1/me/password", {
        method: "PATCH",
        body: JSON.stringify({ current_password: current, new_password: next }),
      });
      await refresh();
      setCurrent("");
      setNext("");
      setMessage(
        user?.has_password
          ? "Password updated."
          : "Password set. You can now use email and password too.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save password.");
    } finally {
      setBusy(false);
    }
  };
  const settingPassword = !user?.has_password;
  return (
    <SafeAreaView style={s.safe}>
      <View style={s.page}>
        <Pressable style={s.back} onPress={() => router.back()}>
          <AntDesign name="left" size={14} color={colors.teal} />
          <Text style={s.backText}>Account</Text>
        </Pressable>
        <Text style={s.eyebrow}>SECURITY</Text>
        <Text style={s.title}>
          {settingPassword ? "Set a password" : "Change password"}
        </Text>
        <Text style={s.description}>
          {settingPassword
            ? "Add an email-and-password sign-in to this Google account."
            : "Choose a new password for your Settlr account."}
        </Text>
        <View style={s.card}>
          {!settingPassword && (
            <TextInput
              value={current}
              onChangeText={setCurrent}
              placeholder="Current password"
              placeholderTextColor={colors.muted}
              style={s.input}
              secureTextEntry
              autoComplete="current-password"
            />
          )}
          <TextInput
            value={next}
            onChangeText={setNext}
            placeholder="New password (at least 8 characters)"
            placeholderTextColor={colors.muted}
            style={s.input}
            secureTextEntry
            autoComplete="new-password"
          />
          {error ? <Text style={s.error}>{error}</Text> : null}
          {message ? <Text style={s.success}>{message}</Text> : null}
          <Pressable
            style={({ pressed }) => [s.button, pressed && { opacity: 0.82 }]}
            onPress={() => void save()}
            disabled={busy || next.length < 8 || (!settingPassword && !current)}
          >
            <Text style={s.buttonText}>
              {busy
                ? "Saving…"
                : settingPassword
                  ? "Set password"
                  : "Update password"}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  page: { padding: 20 },
  back: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 26,
  },
  backText: { color: colors.teal, fontSize: 12, fontWeight: "800" },
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
    marginTop: 4,
  },
  description: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 10,
    marginBottom: 22,
  },
  card: {
    backgroundColor: colors.paper,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 18,
    ...shadow,
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
  button: {
    backgroundColor: colors.teal,
    borderRadius: 13,
    padding: 15,
    alignItems: "center",
    marginTop: 4,
  },
  buttonText: { color: colors.white, fontWeight: "800", fontSize: 12 },
  error: { color: colors.coral, fontSize: 11, marginBottom: 11 },
  success: { color: colors.teal, fontSize: 11, marginBottom: 11 },
});
