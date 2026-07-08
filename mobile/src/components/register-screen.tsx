import { useState } from "react";
import { Pressable, StyleSheet, TextInput } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { MaxContentWidth, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { register } from "@/services/userIdentity";

/**
 * First-launch gate: asks for the user's name and registers this device's
 * identity under it. Rendered instead of the app until registration
 * succeeds (see _layout).
 */
export default function RegisterScreen({
  onRegistered,
}: {
  onRegistered: () => void;
}) {
  const theme = useTheme();

  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const trimmed = name.trim();
    if (trimmed.length === 0 || submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      await register(trimmed);
      onRegistered();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setSubmitting(false);
    }
  };

  return (
    <ThemedView style={styles.screen}>
      <ThemedView style={styles.content}>
        <ThemedText type="title">Welcome</ThemedText>
        <ThemedText themeColor="textSecondary">
          What should other party members call you?
        </ThemedText>

        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          placeholderTextColor={theme.textSecondary}
          autoFocus
          style={[
            styles.input,
            { color: theme.text, backgroundColor: theme.backgroundElement },
          ]}
          onSubmitEditing={submit}
        />
        <Pressable
          onPress={submit}
          disabled={submitting}
          style={({ pressed }) => [
            styles.submitButton,
            { backgroundColor: theme.backgroundSelected },
            (pressed || submitting) && styles.pressed,
          ]}
        >
          <ThemedText type="link">
            {submitting ? "Registering…" : "Continue"}
          </ThemedText>
        </Pressable>

        {error && (
          <ThemedText type="small" style={styles.errorText}>
            {error}
          </ThemedText>
        )}
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: "center",
  },
  content: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    maxWidth: MaxContentWidth,
    width: "100%",
    alignSelf: "center",
  },
  input: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    borderCurve: "continuous",
  },
  submitButton: {
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    borderCurve: "continuous",
    alignItems: "center",
  },
  pressed: {
    opacity: 0.7,
  },
  errorText: {
    color: "#d93025",
  },
});
