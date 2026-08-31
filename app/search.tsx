import AntDesign from "@expo/vector-icons/AntDesign";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { apiFetch } from "../src/api";
import { colors } from "../src/theme";
import {
  Button,
  Card,
  Empty,
  ErrorNotice,
  Field,
  PageTitle,
  Screen,
} from "../src/ui";

type Results = {
  users?: { id: string; name: string; email?: string }[];
  groups?: { id: string; name: string; description?: string }[];
  expenses?: {
    id: string;
    group_id: string;
    description: string;
    amount: number;
    currency: string;
  }[];
};
export default function Search() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Results>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const search = async () => {
    if (query.trim().length < 2) {
      setError("Enter at least two characters.");
      return;
    }
    setBusy(true);
    try {
      setResults(
        await apiFetch<Results>(
          `/api/v1/search?q=${encodeURIComponent(query.trim())}`,
        ),
      );
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Search failed.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen>
      <PageTitle
        eyebrow="FIND ANYTHING"
        title="Search"
        description="People, groups, and expenses in one place."
      />
      <Card>
        <Field
          label="Search"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => void search()}
          placeholder="Name, group, or expense"
          returnKeyType="search"
        />
        <Button
          label={busy ? "Searching…" : "Search"}
          icon="search1"
          disabled={busy}
          onPress={() => void search()}
        />
        {error ? <ErrorNotice message={error} /> : null}
      </Card>
      {results ? (
        <>
          <Result
            title="People"
            items={results.users || []}
            icon="user"
            onPress={(item) => router.push(`/friends/${item.id}`)}
          />
          <Result
            title="Groups"
            items={results.groups || []}
            icon="team"
            onPress={(item) => router.push(`/groups/${item.id}`)}
          />
          <Result
            title="Expenses"
            items={results.expenses || []}
            icon="dollar"
            onPress={(item) => router.push(`/expenses/${item.id}`)}
          />
        </>
      ) : (
        <Empty
          icon="search1"
          title="Start a search"
          text="Search by a person, group, or expense name."
        />
      )}
    </Screen>
  );
}
function Result({
  title,
  items,
  icon,
  onPress,
}: {
  title: string;
  items: { id: string; name?: string; description?: string; email?: string }[];
  icon: string;
  onPress: (item: { id: string }) => void;
}) {
  if (!items.length) return null;
  return (
    <Card>
      <Text style={s.section}>{title}</Text>
      {items.map((item) => (
        <Pressable key={item.id} style={s.row} onPress={() => onPress(item)}>
          <AntDesign name={icon as never} size={17} color={colors.teal} />
          <View style={{ flex: 1 }}>
            <Text style={s.item}>{item.name || item.description}</Text>
            {item.email ? <Text style={s.meta}>{item.email}</Text> : null}
          </View>
          <AntDesign name="right" size={13} color={colors.muted} />
        </Pressable>
      ))}
    </Card>
  );
}
const s = StyleSheet.create({
  section: { color: colors.ink, fontFamily: "serif", fontSize: 21 },
  row: {
    minHeight: 46,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    borderTopWidth: 1,
    borderColor: colors.line,
  },
  item: { color: colors.ink, fontSize: 13, fontWeight: "800" },
  meta: { color: colors.muted, fontSize: 10, marginTop: 2 },
});
