import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, Pressable, StyleSheet } from "react-native";

import AppHeader from "@/components/app-header";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { joinParty } from "@/store/partySlice";

/**
 * Deep-link target for party invitations (videoparty://join/<code>).
 * The short invitation code identifies the party by itself. Joins
 * immediately and lands on the Party tab; on failure the error stays on
 * screen with a way back to the party list.
 */
export default function JoinByLinkScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const theme = useTheme();
  const dispatch = useAppDispatch();

  const joinError = useAppSelector((state) => state.party.joinError);

  useEffect(() => {
    if (!code) return;
    dispatch(joinParty(code))
      .unwrap()
      .then(() => router.replace("/party"))
      .catch(() => {
        // Failure is surfaced via joinError from the store.
      });
  }, [dispatch, code, router]);

  return (
    <ThemedView style={styles.screen}>
      <AppHeader />
      <ThemedView style={styles.body}>
        {joinError ? (
          <>
            <ThemedText type="subtitle">Could not join</ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.centered}>
              {joinError}
            </ThemedText>
            <Pressable
              onPress={() => router.replace("/")}
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.pressed,
              ]}
            >
              <ThemedText type="smallBold" style={styles.backButtonLabel}>
                Go to Parties
              </ThemedText>
            </Pressable>
          </>
        ) : (
          <>
            <ActivityIndicator color={theme.text} />
            <ThemedText themeColor="textSecondary">Joining party…</ThemedText>
          </>
        )}
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  body: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  centered: {
    textAlign: "center",
  },
  backButton: {
    backgroundColor: "#208AEF",
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
  },
  backButtonLabel: {
    color: "#ffffff",
  },
  pressed: {
    opacity: 0.7,
  },
});
