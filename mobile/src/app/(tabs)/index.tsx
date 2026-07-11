import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, TextInput } from "react-native";

import AppHeader from "@/components/app-header";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import {
  BottomTabInset,
  MaxContentWidth,
  Spacing,
} from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  createParty,
  fetchParties,
  joinParty,
  openParty,
} from "@/store/partySlice";

type FormMode = "none" | "create" | "join";

export default function PartiesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const dispatch = useAppDispatch();

  const {
    parties,
    loadingParties,
    partiesError,
    creating,
    createError,
    joining,
    joinError,
  } = useAppSelector((state) => state.party);

  const [formMode, setFormMode] = useState<FormMode>("none");
  const [partyName, setPartyName] = useState("");
  const [inviteInput, setInviteInput] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchParties());
  }, [dispatch]);

  const submitCreate = async () => {
    const name = partyName.trim();
    if (name.length === 0) return;

    try {
      await dispatch(createParty(name)).unwrap();
      setPartyName("");
      setFormMode("none");
      router.navigate("/party");
    } catch {
      // Failure is surfaced via createError from the store.
    }
  };

  const submitJoin = async () => {
    if (inviteInput.trim().length === 0) return;

    // The invite code is "<partyId>/<invitationId>"; extracting the guids
    // also accepts a pasted share message or deep link in any format.
    const guids = inviteInput.match(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi
    );
    if (!guids || guids.length < 2) {
      setInviteError(
        "That does not look like an invite code. Paste the full code from the invitation (two ids separated by a slash)."
      );
      return;
    }
    setInviteError(null);

    const [partyId, invitationId] = guids;
    try {
      await dispatch(joinParty({ partyId, invitationId })).unwrap();
      setInviteInput("");
      setFormMode("none");
      router.navigate("/party");
    } catch {
      // Failure is surfaced via joinError from the store.
    }
  };

  const openExisting = (partyId: string) => {
    dispatch(openParty(partyId));
    router.navigate("/party");
  };

  const inputStyle = [
    styles.input,
    { color: theme.text, backgroundColor: theme.backgroundElement },
  ];

  return (
    <ThemedView style={styles.screen}>
      <AppHeader />
      <FlatList
        style={[styles.list, { backgroundColor: theme.background }]}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        data={parties}
        keyExtractor={(item) => item.partyId}
        refreshing={loadingParties}
        onRefresh={() => dispatch(fetchParties())}
        ListHeaderComponent={
          <ThemedView style={styles.header}>
            <ThemedText type="title">Parties</ThemedText>

            <ThemedView style={styles.actionRow}>
              <ActionButton
                label="Create Party"
                active={formMode === "create"}
                onPress={() =>
                  setFormMode(formMode === "create" ? "none" : "create")
                }
              />
              <ActionButton
                label="Join Party"
                active={formMode === "join"}
                onPress={() => setFormMode(formMode === "join" ? "none" : "join")}
              />
            </ThemedView>

            {formMode === "create" && (
              <ThemedView style={styles.form}>
                <TextInput
                  value={partyName}
                  onChangeText={setPartyName}
                  placeholder="Party name"
                  placeholderTextColor={theme.textSecondary}
                  autoFocus
                  style={inputStyle}
                  onSubmitEditing={submitCreate}
                />
                <SubmitButton
                  label={creating ? "Creating…" : "Create"}
                  disabled={creating}
                  onPress={submitCreate}
                />
                {createError && <ErrorText message={createError} />}
              </ThemedView>
            )}

            {formMode === "join" && (
              <ThemedView style={styles.form}>
                <TextInput
                  value={inviteInput}
                  onChangeText={setInviteInput}
                  placeholder="Paste invite code"
                  placeholderTextColor={theme.textSecondary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                  style={inputStyle}
                  onSubmitEditing={submitJoin}
                />
                <SubmitButton
                  label={joining ? "Joining…" : "Join"}
                  disabled={joining}
                  onPress={submitJoin}
                />
                {(inviteError ?? joinError) && (
                  <ErrorText message={(inviteError ?? joinError)!} />
                )}
              </ThemedView>
            )}

            {partiesError && <ErrorText message={partiesError} />}
          </ThemedView>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => openExisting(item.partyId)}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <ThemedView type="backgroundElement" style={styles.partyRow}>
              <ThemedText style={styles.partyName} numberOfLines={1}>
                {item.name}
              </ThemedText>
              <ThemedView type="backgroundSelected" style={styles.roleBadge}>
                <ThemedText type="small" themeColor="textSecondary">
                  {item.role === "organizer" ? "Organizer" : "Guest"}
                </ThemedText>
              </ThemedView>
            </ThemedView>
          </Pressable>
        )}
        ListEmptyComponent={
          loadingParties ? null : (
            <ThemedText themeColor="textSecondary" style={styles.empty}>
              No parties yet. Create one or join with an invite code.
            </ThemedText>
          )
        }
      />
    </ThemedView>
  );
}

function ActionButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
    >
      <ThemedText type="smallBold" style={styles.actionButtonLabel}>
        {active ? "Cancel" : label}
      </ThemedText>
    </Pressable>
  );
}

function SubmitButton({
  label,
  disabled,
  onPress,
}: {
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.submitButton,
        { backgroundColor: theme.backgroundSelected },
        (pressed || disabled) && styles.pressed,
      ]}
    >
      <ThemedText type="link">{label}</ThemedText>
    </Pressable>
  );
}

function ErrorText({ message }: { message: string }) {
  return (
    <ThemedText type="small" style={styles.errorText}>
      {message}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  content: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
    maxWidth: MaxContentWidth,
    width: "100%",
    alignSelf: "center",
  },
  header: {
    gap: Spacing.three,
  },
  actionRow: {
    flexDirection: "row",
    gap: Spacing.three,
  },
  actionButton: {
    backgroundColor: "#208AEF",
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
  },
  actionButtonLabel: {
    color: "#ffffff",
  },
  form: {
    gap: Spacing.two,
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
  partyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
    borderCurve: "continuous",
  },
  partyName: {
    flex: 1,
  },
  roleBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.two,
  },
  errorText: {
    color: "#d93025",
  },
  empty: {
    textAlign: "center",
    paddingVertical: Spacing.four,
  },
});
