import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, FlatList, StyleSheet, View } from "react-native";
import {
  Button,
  Card,
  Chip,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";

import AppHeader from "@/components/app-header";
import {
  BottomTabInset,
  MaxContentWidth,
  Spacing,
} from "@/constants/theme";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  createParty,
  fetchParties,
  joinParty,
  leaveParty,
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
    const raw = inviteInput.trim();
    if (raw.length === 0) return;

    // The invite is a short 8-character code; a pasted deep link
    // (videoparty://join/<code>) is accepted too. The server treats codes
    // case-insensitively, but normalize here for a tidy request.
    const linkMatch = raw.match(/join\/([0-9a-z]+)/i);
    const code = (linkMatch ? linkMatch[1] : raw).toUpperCase();
    if (!/^[0-9A-Z]{8}$/.test(code)) {
      setInviteError(
        "That does not look like an invite code. It is the 8-character code from the invitation."
      );
      return;
    }
    setInviteError(null);

    try {
      await dispatch(joinParty(code)).unwrap();
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

  // Leaving needs confirmation: getting back in takes a new invitation.
  const confirmLeave = (partyId: string, name: string) => {
    Alert.alert(
      "Leave party?",
      `You will need a new invitation to rejoin "${name}".`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: () => dispatch(leaveParty(partyId)),
        },
      ]
    );
  };

  return (
    <View
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
    >
      <AppHeader />
      <FlatList
        style={styles.list}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        data={parties}
        keyExtractor={(item) => item.partyId}
        refreshing={loadingParties}
        onRefresh={() => dispatch(fetchParties())}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text variant="headlineMedium">Parties</Text>

            <View style={styles.actionRow}>
              <Button
                mode={formMode === "create" ? "outlined" : "contained"}
                icon="plus"
                onPress={() =>
                  setFormMode(formMode === "create" ? "none" : "create")
                }
              >
                {formMode === "create" ? "Cancel" : "Create Party"}
              </Button>
              <Button
                mode={formMode === "join" ? "outlined" : "contained"}
                icon="account-plus"
                onPress={() =>
                  setFormMode(formMode === "join" ? "none" : "join")
                }
              >
                {formMode === "join" ? "Cancel" : "Join Party"}
              </Button>
            </View>

            {formMode === "create" && (
              <View style={styles.form}>
                <TextInput
                  mode="outlined"
                  dense
                  label="Party name"
                  value={partyName}
                  onChangeText={setPartyName}
                  autoFocus
                  onSubmitEditing={submitCreate}
                />
                <Button
                  mode="contained"
                  onPress={submitCreate}
                  loading={creating}
                  disabled={creating}
                >
                  Create
                </Button>
                {createError && <ErrorText message={createError} />}
              </View>
            )}

            {formMode === "join" && (
              <View style={styles.form}>
                <TextInput
                  mode="outlined"
                  dense
                  label="Invite code"
                  value={inviteInput}
                  onChangeText={setInviteInput}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  autoFocus
                  onSubmitEditing={submitJoin}
                />
                <Button
                  mode="contained"
                  onPress={submitJoin}
                  loading={joining}
                  disabled={joining}
                >
                  Join
                </Button>
                {(inviteError ?? joinError) && (
                  <ErrorText message={(inviteError ?? joinError)!} />
                )}
              </View>
            )}

            {partiesError && <ErrorText message={partiesError} />}
          </View>
        }
        renderItem={({ item }) => (
          <Card mode="contained" onPress={() => openExisting(item.partyId)}>
            <View style={styles.partyRow}>
              <Text variant="titleSmall" style={styles.partyName} numberOfLines={1}>
                {item.name}
              </Text>
              <Chip compact>
                {item.role === "organizer" ? "Organizer" : "Guest"}
              </Chip>
              {item.role === "guest" && (
                <Button
                  compact
                  mode="text"
                  textColor={theme.colors.error}
                  onPress={() => confirmLeave(item.partyId, item.name)}
                >
                  Leave
                </Button>
              )}
            </View>
          </Card>
        )}
        ListEmptyComponent={
          loadingParties ? null : (
            <Text
              variant="bodyMedium"
              style={[styles.empty, { color: theme.colors.onSurfaceVariant }]}
            >
              No parties yet. Create one or join with an invite code.
            </Text>
          )
        }
      />
    </View>
  );
}

function ErrorText({ message }: { message: string }) {
  const theme = useTheme();

  return (
    <Text variant="bodySmall" style={{ color: theme.colors.error }}>
      {message}
    </Text>
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
  form: {
    gap: Spacing.two,
  },
  partyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  partyName: {
    flex: 1,
  },
  empty: {
    textAlign: "center",
    paddingVertical: Spacing.four,
  },
});
