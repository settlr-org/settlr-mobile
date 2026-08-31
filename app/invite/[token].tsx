import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "../../src/api";
import { useSession } from "../../src/session";
import { clearPendingInvite, savePendingInvite } from "../../src/pendingInvite";
import { Button, ErrorNotice, PageTitle, Screen } from "../../src/ui";
export default function Invite() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { user } = useSession();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (token) void savePendingInvite(token);
  }, [token]);
  const accept = async () => {
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(`/invite/${token}`)}`);
      return;
    }
    setBusy(true);
    try {
      try {
        const result = await apiFetch<{ group_id: string }>(
          `/api/v1/invites/${encodeURIComponent(token)}/accept`,
          { method: "POST" },
        );
        await clearPendingInvite();
        router.replace(`/groups/${result.group_id}`);
      } catch (groupError) {
        if (!(groupError instanceof ApiError) || groupError.status !== 404)
          throw groupError;
        const result = await apiFetch<{ user_id: string }>(
          `/api/v1/friend-invites/${encodeURIComponent(token)}/accept`,
          { method: "POST" },
        );
        await clearPendingInvite();
        router.replace(`/friends/${result.user_id}`);
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "This invite is invalid or expired.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen>
      <PageTitle
        eyebrow="INVITATION"
        title="You’re invited"
        description="Accept this invitation to start sharing on Settlr."
      />
      <Button
        label={
          busy ? "Accepting…" : user ? "Accept invitation" : "Sign in to accept"
        }
        disabled={busy}
        onPress={() => void accept()}
      />
      {error ? <ErrorNotice message={error} /> : null}
    </Screen>
  );
}
