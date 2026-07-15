import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Text, useTheme } from "react-native-paper";

import AppHeader from "@/components/app-header";
import { Spacing } from "@/constants/theme";
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
    <View
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
    >
      <AppHeader />
      <View style={styles.body}>
        {joinError ? (
          <>
            <Text variant="titleMedium">Could not join</Text>
            <Text
              variant="bodyMedium"
              style={[
                styles.centered,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              {joinError}
            </Text>
            <Button mode="contained" onPress={() => router.replace("/")}>
              Go to Parties
            </Button>
          </>
        ) : (
          <>
            <ActivityIndicator />
            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              Joining party…
            </Text>
          </>
        )}
      </View>
    </View>
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
});
