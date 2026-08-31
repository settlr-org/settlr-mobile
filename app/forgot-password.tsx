import { router } from "expo-router";
import { useState } from "react";
import { apiFetch } from "../src/api";
import { Button, ErrorNotice, Field, PageTitle, Screen } from "../src/ui";
export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const submit = async () => {
    try {
      await apiFetch("/api/v1/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not request a reset link.",
      );
    }
  };
  return (
    <Screen>
      <PageTitle
        eyebrow="ACCOUNT RECOVERY"
        title={sent ? "Check your inbox" : "Reset your password"}
        description={
          sent
            ? "If that address has an account, a reset link is on its way."
            : "Enter the email address you use for Settlr."
        }
      />
      {sent ? (
        <Button
          label="Back to sign in"
          onPress={() => router.replace("/login")}
        />
      ) : (
        <>
          <Field
            label="Email address"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Button label="Send reset link" onPress={() => void submit()} />
        </>
      )}
      {error ? <ErrorNotice message={error} /> : null}
    </Screen>
  );
}
