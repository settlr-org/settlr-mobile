import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
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
  const load = useCallback(async () => {
    try {
      const p = await apiFetch<Person>(`/api/v1/users/${id}`);
      const [l, pay] = await Promise.all([
        apiFetch<Ledger>(`/api/v1/friends/${id}/ledger`),
        apiFetch<Payment>(`/api/v1/users/${id}/payment-info`),
      ]);
      setPerson(p);
      setLedger(l);
      setPayment(pay);
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
  return (
    <Screen>
      <PageTitle
        eyebrow="FRIEND"
        title={person?.name || "Friend"}
        description={person?.email || "Direct shared ledger"}
      />
      <Card>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{initials(person?.name)}</Text>
        </View>
        <Text style={s.section}>Direct ledger</Text>
        <Text style={s.meta}>
          {ledger?.balance === undefined
            ? "No direct balance yet."
            : money(ledger.balance, ledger.currency)}
        </Text>
        {ledger?.group_id ? (
          <Button
            label="Open ledger"
            onPress={() => router.push(`/groups/${ledger.group_id}`)}
          />
        ) : null}
      </Card>
      <Card>
        <Text style={s.section}>Payment details</Text>
        <Text style={s.item}>{payment?.bank_name || "No bank shared"}</Text>
        <Text style={s.meta}>
          {payment?.payment_handle || "No payment handle shared"}
        </Text>
      </Card>
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
  section: { color: colors.ink, fontFamily: "serif", fontSize: 22 },
  item: { color: colors.ink, fontSize: 13, fontWeight: "800" },
  meta: { color: colors.muted, fontSize: 11 },
});
