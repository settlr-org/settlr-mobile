import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import { apiFetch } from "../../src/api";
import { colors } from "../../src/theme";
import {
  Button,
  Card,
  ConfirmAction,
  ErrorNotice,
  Loading,
  PageTitle,
  Screen,
} from "../../src/ui";
import { initials, money } from "../../src/types";
type Person = { id: string; name: string; email?: string };
type Ledger = {
  group_id: string;
  group_name?: string;
  balance?: number;
  currency?: string;
};
type Payment = {
  bank_name?: string;
  payment_handle?: string;
  bank_qr_url?: string;
};
export default function FriendDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [person, setPerson] = useState<Person>();
  const [ledger, setLedger] = useState<Ledger>();
  const [payment, setPayment] = useState<Payment>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [requested, setRequested] = useState(false);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      const p = await apiFetch<Person>(`/api/v1/users/${id}`);
      setPerson(p);
      const [l, pay] = await Promise.allSettled([
        apiFetch<Ledger>(`/api/v1/friends/${id}/ledger`),
        apiFetch<Payment>(`/api/v1/users/${id}/payment-info`),
      ]);
      setLedger(l.status === "fulfilled" ? l.value : undefined);
      setPayment(pay.status === "fulfilled" ? pay.value : undefined);
      setError("");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not load friend.",
      );
    } finally {
      setLoading(false);
    }
  }, [id]);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );
  if (loading)
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  if (!person)
    return (
      <Screen>
        <ErrorNotice
          message={error || "Person not found."}
          retry={() => void load()}
        />
      </Screen>
    );

  const requestFriend = async () => {
    if (busy || requested) return;
    setBusy(true);
    try {
      await apiFetch(`/api/v1/friends/${id}/request`, { method: "POST" });
      setRequested(true);
      setError("");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not send request.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <PageTitle
        eyebrow={ledger ? "CONNECTED FRIEND" : "SETTLR MEMBER"}
        title={person.name}
        description={
          ledger
            ? person.email || "Direct shared ledger"
            : "Send a request to share a direct ledger."
        }
      />
      <Card>
        <View style={s.profileRow}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initials(person.name)}</Text>
          </View>
          <View style={s.profileCopy}>
            <Text style={s.section} numberOfLines={1}>
              {person.name}
            </Text>
            <Text style={s.meta} numberOfLines={1}>
              {ledger ? "Connected on Settlr" : "Not connected yet"}
            </Text>
          </View>
        </View>
        {ledger ? (
          <>
            <Text style={s.item}>Direct balance</Text>
            <Text style={s.balance}>
              {ledger.balance === undefined
                ? "No direct balance yet."
                : money(ledger.balance, ledger.currency)}
            </Text>
          </>
        ) : (
          <Button
            testID="friend-request"
            label={
              requested ? "Request sent" : busy ? "Sending…" : "Add friend"
            }
            disabled={requested || busy}
            onPress={() => void requestFriend()}
          />
        )}
        {ledger?.group_id ? (
          <Button
            testID="friend-open-ledger"
            label="Open ledger"
            onPress={() => router.push(`/groups/${ledger.group_id}`)}
          />
        ) : null}
      </Card>
      {ledger ? (
        <Card>
          <Text style={s.section}>Payment details</Text>
          <Text style={s.item}>{payment?.bank_name || "No bank shared"}</Text>
          <Text style={s.meta}>
            {payment?.payment_handle || "No payment handle shared"}
          </Text>
          {payment?.bank_qr_url ? (
            <Button
              testID="friend-payment-qr"
              label="Open payment QR"
              secondary
              onPress={() =>
                void Linking.openURL(payment.bank_qr_url!).catch(() =>
                  setError("Could not open this payment QR."),
                )
              }
            />
          ) : null}
        </Card>
      ) : null}
      {ledger ? (
        <Card>
          <ConfirmAction
            title="Remove friend?"
            description="Their direct ledger remains in your history."
            label="Remove"
            onConfirm={async () => {
              await apiFetch(`/api/v1/friends/${id}`, { method: "DELETE" });
              router.replace("/(tabs)/friends");
            }}
          >
            {(open) => <Button label="Remove friend" danger onPress={open} />}
          </ConfirmAction>
          <ConfirmAction
            title="Block friend?"
            description="They will no longer be able to send requests."
            label="Block"
            onConfirm={async () => {
              await apiFetch(`/api/v1/friends/${id}/block`, { method: "POST" });
              router.replace("/(tabs)/friends");
            }}
          >
            {(open) => <Button label="Block friend" danger onPress={open} />}
          </ConfirmAction>
        </Card>
      ) : null}
      {error ? <ErrorNotice message={error} retry={() => void load()} /> : null}
    </Screen>
  );
}
const s = StyleSheet.create({
  avatar: {
    width: 55,
    height: 55,
    borderRadius: 18,
    backgroundColor: colors.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.white, fontWeight: "800" },
  profileRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  profileCopy: { flex: 1, minWidth: 0 },
  section: { color: colors.ink, fontFamily: "serif", fontSize: 22 },
  item: { color: colors.ink, fontSize: 13, fontWeight: "800" },
  meta: { color: colors.muted, fontSize: 11 },
  balance: { color: colors.teal, fontSize: 18, fontWeight: "800" },
});
