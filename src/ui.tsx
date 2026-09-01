import AntDesign from "@expo/vector-icons/AntDesign";
import { ReactNode, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radius, shadow, space, type } from "./theme";

export function Screen({
  children,
  scroll = true,
}: {
  children: ReactNode;
  scroll?: boolean;
}) {
  const body = <View style={styles.page}>{children}</View>;
  return (
    <SafeAreaView style={styles.safe}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scroll}>{body}</ScrollView>
      ) : (
        body
      )}
    </SafeAreaView>
  );
}

export function PageTitle({
  eyebrow,
  title,
  description,
  action,
  titleNumberOfLines,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  titleNumberOfLines?: number;
}) {
  return (
    <View style={styles.titleRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.eyebrow}>{eyebrow || "SETTLR"}</Text>
        <Text style={styles.title} numberOfLines={titleNumberOfLines}>
          {title}
        </Text>
        {description ? (
          <Text style={styles.description}>{description}</Text>
        ) : null}
      </View>
      {action}
    </View>
  );
}

export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: object;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Button({
  label,
  onPress,
  icon,
  secondary,
  danger,
  disabled,
  testID,
}: {
  label: string;
  onPress: () => void;
  icon?: string;
  secondary?: boolean;
  danger?: boolean;
  disabled?: boolean;
  testID?: string;
}) {
  const color = danger ? colors.coral : secondary ? colors.ink : colors.white;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.buttonSecondary,
        danger && styles.buttonDanger,
        disabled && styles.buttonMuted,
        pressed && styles.buttonPressed,
      ]}
    >
      {icon ? <AntDesign name={icon as never} size={16} color={color} /> : null}
      <Text
        style={[
          styles.buttonText,
          secondary && styles.buttonSecondaryText,
          danger && styles.buttonDangerText,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Field(props: TextInputProps & { label: string }) {
  const { label, ...input } = props;
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        style={styles.input}
        {...input}
      />
    </View>
  );
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <View style={styles.state}>
      <ActivityIndicator color={colors.teal} />
      <Text style={styles.description}>{label}</Text>
    </View>
  );
}

export function Empty({
  icon = "inbox",
  title,
  text,
}: {
  icon?: string;
  title: string;
  text?: string;
}) {
  return (
    <Card style={styles.empty}>
      <AntDesign name={icon as never} size={28} color={colors.teal} />
      <Text style={styles.emptyTitle}>{title}</Text>
      {text ? <Text style={styles.description}>{text}</Text> : null}
    </Card>
  );
}

export function ErrorNotice({
  message,
  retry,
}: {
  message: string;
  retry?: () => void;
}) {
  return (
    <View style={styles.error}>
      <Text style={styles.errorText}>{message}</Text>
      {retry ? (
        <Pressable onPress={retry}>
          <Text style={styles.retry}>Try again</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function ConfirmAction({
  title,
  description,
  label = "Delete",
  danger = true,
  onConfirm,
  children,
}: {
  title: string;
  description: string;
  label?: string;
  danger?: boolean;
  onConfirm: () => void | Promise<void>;
  children: (open: () => void) => ReactNode;
}) {
  const [visible, setVisible] = useState(false);
  const confirm = async () => {
    await onConfirm();
    setVisible(false);
  };
  return (
    <>
      {children(() => setVisible(true))}
      <Modal
        transparent
        visible={visible}
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.backdrop}>
          <Card style={styles.dialog}>
            <Text style={styles.dialogTitle}>{title}</Text>
            <Text style={styles.description}>{description}</Text>
            <View style={styles.dialogActions}>
              <Button
                label="Cancel"
                secondary
                onPress={() => setVisible(false)}
              />
              <Button
                label={label}
                danger={danger}
                onPress={() => void confirm()}
              />
            </View>
          </Card>
        </View>
      </Modal>
    </>
  );
}

export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  scroll: { paddingBottom: 120 },
  page: { padding: space.lg, gap: space.md },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.md,
    marginBottom: 4,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.teal,
    letterSpacing: 1.8,
  },
  title: {
    fontFamily: type.title,
    color: colors.ink,
    fontSize: 30,
    lineHeight: 36,
    marginTop: 2,
  },
  description: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  card: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.md,
    ...shadow,
  },
  button: {
    minHeight: 44,
    borderRadius: radius.md,
    backgroundColor: colors.teal,
    paddingHorizontal: space.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
  },
  buttonSecondary: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderWidth: 1,
  },
  buttonDanger: {
    backgroundColor: "#fff1f1",
    borderColor: "#e8c4c5",
    borderWidth: 1,
  },
  buttonMuted: { opacity: 0.5 },
  buttonPressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  buttonText: { color: colors.white, fontSize: 13, fontWeight: "800" },
  buttonSecondaryText: { color: colors.ink },
  buttonDangerText: { color: colors.coral },
  field: { gap: 6 },
  label: { fontSize: 12, fontWeight: "800", color: colors.ink },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    backgroundColor: colors.cream,
    color: colors.ink,
    fontSize: 15,
  },
  state: { paddingVertical: 48, alignItems: "center", gap: 12 },
  empty: { alignItems: "center", paddingVertical: 30 },
  emptyTitle: { color: colors.ink, fontFamily: type.title, fontSize: 22 },
  error: {
    padding: 12,
    backgroundColor: colors.coralSoft,
    borderRadius: radius.md,
    gap: 6,
  },
  errorText: { color: colors.coral, fontSize: 13 },
  retry: { color: colors.teal, fontWeight: "800", fontSize: 12 },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(8,20,16,.55)",
    justifyContent: "center",
    padding: 22,
  },
  dialog: { gap: 14 },
  dialogTitle: { color: colors.ink, fontFamily: type.title, fontSize: 25 },
  dialogActions: { flexDirection: "row", justifyContent: "flex-end", gap: 8 },
});
