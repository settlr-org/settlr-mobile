import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Text } from "react-native";
import { apiFetch } from "../src/api";
import { Button, ErrorNotice, Field, PageTitle, Screen } from "../src/ui";
export default function ResetPassword() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const reset = async () => {
    if (!token) {
      setError("This reset link is missing its token.");
      return;
    }
    try {
      await apiFetch("/api/v1/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, new_password: password }),
      });
      setDone(true);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not reset password.",
      );
    }
  };
  return (
    <Screen>
      <PageTitle
        eyebrow="ACCOUNT RECOVERY"
        title={done ? "Password changed" : "Choose a new password"}
        description={
          done
            ? "Sign in using your new password."
            : "Choose a password with at least eight characters."
        }
      />
      {done ? (
        <Button
          label="Go to sign in"
          onPress={() => router.replace("/login")}
        />
      ) : (
        <>
          <Field
            label="New password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
          />
          <Button
            label="Reset password"
            disabled={password.length < 8}
            onPress={() => void reset()}
          />
        </>
      )}
      {error ? <ErrorNotice message={error} /> : null}
    </Screen>
  );
}
