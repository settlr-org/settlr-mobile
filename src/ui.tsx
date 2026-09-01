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
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {body}
        </ScrollView>
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
    <View style={styles.titleRow} accessibilityRole="header">
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.eyebrow} accessibilityLabel={eyebrow || "SETTLR"}>
          {eyebrow || "SETTLR"}
        </Text>
        <Text
          style={styles.title}
          numberOfLines={titleNumberOfLines}
          ellipsizeMode="tail"
        >
          {title}
        </Text>
        {description ? (
          <Text style={styles.description}>{description}</Text>
        ) : null}
      </View>
      {action ? <View style={styles.titleAction}>{action}</View> : null}
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
      accessibilityState={{ disabled: !!disabled }}
      accessibilityLabel={label}
      hitSlop={6}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.buttonSecondary,
        danger && styles.buttonDanger,
        disabled && styles.buttonMuted,
        pressed && !disabled && styles.buttonPressed,
      ]}
    >
      {icon ? <AntDesign name={icon as never} size={15} color={color} /> : null}
      <Text
        style={[
          styles.buttonText,
          secondary && styles.buttonSecondaryText,
          danger && styles.buttonDangerText,
          disabled && styles.buttonTextDisabled,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Field(
  props: TextInputProps & { label: string; error?: string },
) {
  const { label, error, ...input } = props;
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        accessibilityState={{ disabled: !!input.editable === false }}
        placeholderTextColor={colors.muted}
        style={[
          styles.input,
          error && styles.inputError,
          input.multiline && styles.inputMultiline,
        ]}
        {...input}
      />
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <View style={styles.state} accessibilityRole="progressbar">
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
      <View style={styles.emptyIcon}>
        <AntDesign name={icon as never} size={22} color={colors.teal} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {text ? <Text style={styles.emptyText}>{text}</Text> : null}
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
    <View style={styles.error} accessibilityRole="alert">
      <Text style={styles.errorText}>{message}</Text>
      {retry ? (
        <Pressable
          onPress={retry}
          accessibilityRole="button"
          accessibilityLabel="Try again"
          hitSlop={8}
          style={styles.retryHit}
        >
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
  const [busy, setBusy] = useState(false);
  const confirm = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onConfirm();
      setVisible(false);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      {children(() => setVisible(true))}
      <Modal
        transparent
        visible={visible}
        animationType="fade"
        onRequestClose={() => !busy && setVisible(false)}
        statusBarTranslucent
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => !busy && setVisible(false)}
        >
          <Pressable style={[styles.dialogWrap]} onPress={() => {}}>
            <Card style={styles.dialog}>
              <Text style={styles.dialogTitle}>{title}</Text>
              <Text style={styles.description}>{description}</Text>
              <View style={styles.dialogActions}>
                <Button
                  label="Cancel"
                  secondary
                  disabled={busy}
                  onPress={() => setVisible(false)}
                />
                <Button
                  label={busy ? "Please wait…" : label}
                  danger={danger}
                  disabled={busy}
                  onPress={() => void confirm()}
                />
              </View>
            </Card>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  scroll: { paddingBottom: 96 },
  page: { padding: space.lg, gap: space.md },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.md,
    marginBottom: 2,
  },
  titleAction: { marginLeft: space.sm, alignSelf: "flex-start", paddingTop: 2 },
  eyebrow: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.teal,
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },
  title: {
    fontFamily: type.title,
    color: colors.ink,
    fontSize: 26,
    lineHeight: 32,
    marginTop: 4,
  },
  description: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
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
    paddingVertical: 10,
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
    backgroundColor: colors.dangerBg,
    borderColor: colors.dangerBorder,
    borderWidth: 1,
  },
  buttonMuted: { opacity: 0.52 },
  buttonPressed: { opacity: 0.84 },
  buttonText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
  },
  buttonSecondaryText: { color: colors.ink },
  buttonDangerText: { color: colors.coral },
  buttonTextDisabled: { opacity: 0.9 },
  field: { gap: 6 },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.ink,
    letterSpacing: 0.2,
  },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.paper,
    color: colors.ink,
    fontSize: 15,
    textAlignVertical: "center",
  },
  inputMultiline: { minHeight: 72, paddingTop: 12, textAlignVertical: "top" },
  inputError: { borderColor: colors.coral },
  fieldError: { color: colors.coral, fontSize: 11, marginTop: 2 },
  state: { paddingVertical: 48, alignItems: "center", gap: 12 },
  empty: { alignItems: "center", paddingVertical: 28, gap: 10 },
  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.sage,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    color: colors.ink,
    fontFamily: type.title,
    fontSize: 18,
    textAlign: "center",
  },
  emptyText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 2,
  },
  error: {
    padding: 12,
    backgroundColor: colors.coralSoft,
    borderRadius: radius.md,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
  },
  errorText: { color: colors.coral, fontSize: 13, lineHeight: 18 },
  retry: { color: colors.teal, fontWeight: "800", fontSize: 12 },
  retryHit: {
    alignSelf: "flex-start",
    paddingVertical: 4,
    paddingHorizontal: 2,
    minHeight: 28,
    justifyContent: "center",
  },
  backdrop: {
    flex: 1,
    backgroundColor: colors.backdrop,
    justifyContent: "center",
    padding: 20,
  },
  dialogWrap: { width: "100%", maxWidth: 420, alignSelf: "center" },
  dialog: { gap: 14 },
  dialogTitle: {
    color: colors.ink,
    fontFamily: type.title,
    fontSize: 22,
    lineHeight: 26,
  },
  dialogActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    flexWrap: "wrap",
    marginTop: 4,
  },
});
