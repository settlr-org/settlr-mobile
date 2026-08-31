import AntDesign from "@expo/vector-icons/AntDesign";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { apiFetch } from "../src/api";
import { shareApiFile } from "../src/files";
import { useSession } from "../src/session";
import { colors } from "../src/theme";
import {
  Button,
  Card,
  ConfirmAction,
  ErrorNotice,
  Field,
  Loading,
  PageTitle,
  Screen,
  styles,
} from "../src/ui";

type Prefs = {
  email_enabled: boolean;
  push_enabled: boolean;
  friend_request_enabled: boolean;
  expense_enabled: boolean;
  settlement_enabled: boolean;
};
type Session = {
  id: string;
  user_agent: string;
  ip: string;
  created_at: string;
  last_used_at: string;
  expires_at: string;
  revoked_at?: string;
};
type Payment = {
  bank_qr_url: string;
  bank_name: string;
  payment_handle: string;
};
export default function Settings() {
  const { user, refresh, signOut } = useSession();
  const [prefs, setPrefs] = useState<Prefs>();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [payment, setPayment] = useState<Payment>();
  const [name, setName] = useState(user?.name || "");
  const [currency, setCurrency] = useState(user?.default_currency || "NPR");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    try {
      const [p, s, pay] = await Promise.all([
        apiFetch<Prefs>("/api/v1/me/notification-preferences"),
        apiFetch<{ data: Session[] }>("/api/v1/auth/sessions"),
        apiFetch<Payment>("/api/v1/me/payment-info"),
      ]);
      setPrefs(p);
      setSessions(s.data);
      setPayment(pay);
      setName(user?.name || "");
      setCurrency(user?.default_currency || "NPR");
      setError("");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to load settings.",
      );
    } finally {
      setLoading(false);
    }
  }, [user?.default_currency, user?.name]);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );
  const saveProfile = async () => {
    try {
      await apiFetch("/api/v1/me", {
        method: "PATCH",
        body: JSON.stringify({
          name,
          email: user?.email,
          default_currency: currency,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });
      await refresh();
      setSaved("Profile saved.");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not save profile.",
      );
    }
  };
  const toggle = async (key: keyof Prefs) => {
    if (!prefs) return;
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    try {
      await apiFetch("/api/v1/me/notification-preferences", {
        method: "PATCH",
        body: JSON.stringify(next),
      });
    } catch (cause) {
      setPrefs(prefs);
      setError(
        cause instanceof Error ? cause.message : "Could not save preference.",
      );
    }
  };
  const leave = async () => {
    await signOut();
    router.replace("/login");
  };
  if (loading)
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  return (
    <Screen>
      <PageTitle
        eyebrow="SETTINGS"
        title="Your account"
        description="Profile, security, preferences, and data."
      />
      {error ? <ErrorNotice message={error} retry={() => void load()} /> : null}
      {saved ? <Text style={s.saved}>{saved}</Text> : null}
      <Card>
        <Text style={s.section}>Profile</Text>
        <Field label="Name" value={name} onChangeText={setName} />
        <Field
          label="Default currency"
          value={currency}
          onChangeText={setCurrency}
          autoCapitalize="characters"
        />
        <Button label="Save profile" onPress={() => void saveProfile()} />
      </Card>
      <Card>
        <Text style={s.section}>Security</Text>
        <Pressable style={s.row} onPress={() => router.push("/password")}>
          <AntDesign name="lock" size={18} color={colors.teal} />
          <View style={{ flex: 1 }}>
            <Text style={s.item}>
              {user?.has_password ? "Change password" : "Set a password"}
            </Text>
            <Text style={s.meta}>Use email and password alongside Google.</Text>
          </View>
          <AntDesign name="right" size={13} color={colors.muted} />
        </Pressable>
        <Button
          label="Resend verification email"
          secondary
          onPress={() =>
            void apiFetch("/api/v1/auth/resend-verification", {
              method: "POST",
            }).then(() => setSaved("Verification email sent."))
          }
        />
      </Card>
      <Card>
        <Text style={s.section}>Notifications</Text>
        {prefs
          ? (
              Object.entries({
                email_enabled: "Email notifications",
                push_enabled: "Push notifications",
                friend_request_enabled: "Friend requests",
                expense_enabled: "Expense updates",
                settlement_enabled: "Settlement updates",
              }) as [keyof Prefs, string][]
            ).map(([key, label]) => (
              <View style={s.row} key={key}>
                <Text style={[s.item, { flex: 1 }]}>{label}</Text>
                <Switch
                  value={prefs[key]}
                  onValueChange={() => void toggle(key)}
                  trackColor={{ true: colors.teal }}
                />
              </View>
            ))
          : null}
      </Card>
      <Card>
        <Text style={s.section}>Payment details</Text>
        <PaymentEditor payment={payment} onSaved={load} />
      </Card>
      <Card>
        <Text style={s.section}>Active sessions</Text>
        {sessions.map((item) => (
          <View style={s.row} key={item.id}>
            <View style={{ flex: 1 }}>
              <Text style={s.item}>{item.user_agent || "Settlr session"}</Text>
              <Text style={s.meta}>
                {item.ip} · last active{" "}
                {new Date(item.last_used_at).toLocaleString()}
              </Text>
            </View>
            <Button
              label="Revoke"
              danger
              onPress={() =>
                void apiFetch(`/api/v1/auth/sessions/${item.id}`, {
                  method: "DELETE",
                }).then(load)
              }
            />
          </View>
        ))}
        <Button
          label="Sign out other sessions"
          secondary
          onPress={() =>
            void apiFetch("/api/v1/auth/sessions", { method: "DELETE" }).then(
              load,
            )
          }
        />
      </Card>
      <Card>
        <Text style={s.section}>Your data</Text>
        <Text style={s.meta}>Export a portable copy of your Settlr data.</Text>
        <Button
          label="Export CSV"
          secondary
          onPress={() =>
            void shareApiFile("/api/v1/me/export.csv", "settlr-data.csv").catch(
              (cause: unknown) =>
                setError(
                  cause instanceof Error
                    ? cause.message
                    : "Could not export data.",
                ),
            )
          }
        />
        <Button
          label="Export JSON"
          secondary
          onPress={() =>
            void shareApiFile(
              "/api/v1/me/export.json",
              "settlr-data.json",
            ).catch((cause: unknown) =>
              setError(
                cause instanceof Error
                  ? cause.message
                  : "Could not export data.",
              ),
            )
          }
        />
      </Card>
      <Card>
        <Button label="Sign out" danger onPress={() => void leave()} />
        <ConfirmAction
          title="Delete your account?"
          description="This permanently removes your Settlr account and cannot be undone."
          label="Delete account"
          onConfirm={async () => {
            await apiFetch("/api/v1/me", { method: "DELETE" });
            await leave();
          }}
        >
          {(open) => <Button label="Delete account" danger onPress={open} />}
        </ConfirmAction>
      </Card>
    </Screen>
  );
}
function PaymentEditor({
  payment,
  onSaved,
}: {
  payment?: Payment;
  onSaved: () => Promise<void>;
}) {
  const [bank, setBank] = useState(payment?.bank_name || "");
  const [handle, setHandle] = useState(payment?.payment_handle || "");
  const [qr, setQr] = useState(payment?.bank_qr_url || "");
  const [error, setError] = useState("");
  const save = async () => {
    try {
      await apiFetch("/api/v1/me/payment-info", {
        method: "PUT",
        body: JSON.stringify({
          bank_name: bank,
          payment_handle: handle,
          bank_qr_url: qr,
        }),
      });
      await onSaved();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not save payment details.",
      );
    }
  };
  return (
    <>
      <Field
        label="Bank"
        value={bank}
        onChangeText={setBank}
        placeholder="Optional"
      />
      <Field
        label="Payment handle"
        value={handle}
        onChangeText={setHandle}
        placeholder="Optional"
      />
      <Field
        label="QR image URL"
        value={qr}
        onChangeText={setQr}
        placeholder="Optional"
      />
      {error ? <ErrorNotice message={error} /> : null}
      <Button label="Save payment details" onPress={() => void save()} />
    </>
  );
}
const s = StyleSheet.create({
  section: { color: colors.ink, fontFamily: "serif", fontSize: 22 },
  row: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderTopWidth: 1,
    borderColor: colors.line,
  },
  item: { color: colors.ink, fontSize: 12, fontWeight: "800" },
  meta: { color: colors.muted, fontSize: 10, marginTop: 3 },
  saved: {
    color: colors.teal,
    backgroundColor: colors.sage,
    padding: 11,
    borderRadius: 11,
    fontSize: 12,
  },
});
