import * as Device from "expo-device";
import { Platform, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AnimatedIcon } from "@/components/animated-icon";
import { HintRow } from "@/components/hint-row";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { WebBadge } from "@/components/web-badge";
import { BottomTabInset, MaxContentWidth, Spacing } from "@/constants/theme";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { createParty } from "@/store/partySlice";

function getDevMenuHint() {
  if (Platform.OS === "web") {
    return <ThemedText type="small">use browser devtools</ThemedText>;
  }
  if (Device.isDevice) {
    return (
      <ThemedText type="small">
        shake device or press <ThemedText type="code">m</ThemedText> in terminal
      </ThemedText>
    );
  }
  const shortcut = Platform.OS === "android" ? "cmd+m (or ctrl+m)" : "cmd+d";
  return (
    <ThemedText type="small">
      press <ThemedText type="code">{shortcut}</ThemedText>
    </ThemedText>
  );
}

export default function HomeScreen() {
  const dispatch = useAppDispatch();
  const { party, creating, createError } = useAppSelector(
    (state) => state.party
  );

  const handleCreateParty = () => {
    dispatch(createParty("My Party"));
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.heroSection}>
          <AnimatedIcon />
          <ThemedText type="title" style={styles.title}>
            Welcome to&nbsp;VideoParty
          </ThemedText>
          <Pressable
            onPress={handleCreateParty}
            disabled={creating}
            style={({ pressed }) => [
              styles.createButton,
              (pressed || creating) && styles.createButtonPressed,
            ]}
          >
            <ThemedText type="smallBold" style={styles.createButtonLabel}>
              {creating ? "Creating…" : "Create Party"}
            </ThemedText>
          </Pressable>
          {party && (
            <ThemedText type="small">
              Party created: <ThemedText type="code">{party.partyId}</ThemedText>
            </ThemedText>
          )}
          {createError && (
            <ThemedText type="small" style={styles.errorText}>
              {createError}
            </ThemedText>
          )}
        </ThemedView>

        <ThemedText type="code" style={styles.code}>
          get started
        </ThemedText>

        <ThemedView type="backgroundElement" style={styles.stepContainer}>
          <HintRow
            title="Try editing"
            hint={<ThemedText type="code">src/app/index.tsx</ThemedText>}
          />
          <HintRow title="Dev tools" hint={getDevMenuHint()} />
          <HintRow
            title="Fresh start"
            hint={<ThemedText type="code">npm run reset-project</ThemedText>}
          />
        </ThemedView>

        {Platform.OS === "web" && <WebBadge />}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    flexDirection: "row",
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    alignItems: "center",
    gap: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
    maxWidth: MaxContentWidth,
  },
  heroSection: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
  },
  title: {
    textAlign: "center",
  },
  createButton: {
    backgroundColor: "#208AEF",
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
  },
  createButtonPressed: {
    opacity: 0.6,
  },
  createButtonLabel: {
    color: "#ffffff",
  },
  errorText: {
    color: "#d93025",
    textAlign: "center",
  },
  code: {
    textTransform: "uppercase",
  },
  stepContainer: {
    gap: Spacing.three,
    alignSelf: "stretch",
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.four,
    borderRadius: Spacing.four,
  },
});
