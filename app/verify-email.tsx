import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Text } from "react-native";
import { apiFetch } from "../src/api";
import { getPendingInvite } from "../src/pendingInvite";
import { Button, ErrorNotice, Loading, PageTitle, Screen } from "../src/ui";

export default function VerifyEmail() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [state, setState] = useState<"loading" | "done" | "error">("loading");
  const [error, setError] = useState("");
  useEffect(() => {
    if (!token) {
      setError("This verification link is missing its token.");
      setState("error");
      return;
    }
    apiFetch("/api/v1/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ token }),
    })
      .then(() => setState("done"))
      .catch((cause: unknown) => {
        setError(
          cause instanceof Error
            ? cause.message
            : "This verification link is invalid or expired.",
        );
        setState("error");
      });
  }, [token]);
  return (
    <Screen>
      <PageTitle
        eyebrow="EMAIL VERIFICATION"
        title={state === "done" ? "Email verified" : "Verify your email"}
        description={
          state === "done"
            ? "You can now sign in to Settlr."
            : "We are confirming your email address."
        }
      />
      {state === "loading" ? <Loading /> : null}
      {state === "error" ? <ErrorNotice message={error} /> : null}
      {state !== "loading" ? (
        <Button
          label="Go to sign in"
          onPress={() =>
            void getPendingInvite().then((invite) =>
              router.replace(
                invite ? `/login?next=/invite/${invite}` : "/login",
              ),
            )
          }
        />
      ) : null}
    </Screen>
  );
}
