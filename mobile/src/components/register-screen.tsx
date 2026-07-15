import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Text, TextInput, useTheme } from "react-native-paper";

import { MaxContentWidth, Spacing } from "@/constants/theme";
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
    <View
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.content}>
        <Text variant="headlineMedium">Welcome</Text>
        <Text
          variant="bodyMedium"
          style={{ color: theme.colors.onSurfaceVariant }}
        >
          What should other party members call you?
        </Text>

        <TextInput
          mode="outlined"
          label="Your name"
          value={name}
          onChangeText={setName}
          autoFocus
          onSubmitEditing={submit}
        />
        <Button
          mode="contained"
          onPress={submit}
          loading={submitting}
          disabled={submitting}
        >
          {submitting ? "Registering…" : "Continue"}
        </Button>

        {error && (
          <Text variant="bodySmall" style={{ color: theme.colors.error }}>
            {error}
          </Text>
        )}
      </View>
    </View>
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
});
