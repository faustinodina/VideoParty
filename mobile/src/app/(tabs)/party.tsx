import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, FlatList, Platform, Share, StyleSheet, View } from 'react-native';
import {
  Button,
  Card,
  Chip,
  IconButton,
  Text,
  useTheme,
} from 'react-native-paper';

import AppHeader from '@/components/app-header';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { createInvitation } from '@/services/partyApi';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  leaveParty,
  removeMember,
  selectActiveParty,
} from '@/store/partySlice';

export default function PartyScreen() {
  const theme = useTheme();
  const router = useRouter();
  const dispatch = useAppDispatch();

  const activeParty = useAppSelector(selectActiveParty);
  const members = useAppSelector((state) => state.party.members);

  // Web-only fallback feedback: set when the invitation was copied to the
  // clipboard because the browser has no share dialog.
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  const shareParty = async () => {
    if (!activeParty) return;
    setShareError(null);

    // Every share gets its own single-use invitation; the API rejects a
    // second join with the same id.
    let invitationId: string;
    try {
      ({ invitationId } = await createInvitation(activeParty.partyId));
    } catch {
      setShareError('Could not create an invitation. Check your connection and try again.');
      return;
    }

    const message =
      `Join my party "${activeParty.name}" on VideoParty!\n` +
      `Tap to join: videoparty://join/${invitationId}\n` +
      `Or type this invite code into Join Party: ${invitationId}`;

    try {
      if (Platform.OS === 'web') {
        if (navigator.share) {
          await navigator.share({ text: message });
        } else {
          await navigator.clipboard.writeText(message);
          setCopiedInvite(true);
        }
      } else {
        await Share.share({ message });
      }
    } catch {
      // Dismissing the share dialog rejects on some platforms; not an error.
    }
  };

  const exitParty = () => {
    if (!activeParty) return;
    // Leaving needs confirmation: getting back in takes a new invitation.
    Alert.alert(
      'Leave party?',
      `You will need a new invitation to rejoin "${activeParty.name}".`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(leaveParty(activeParty.partyId)).unwrap();
              // The active party is gone; land back on the list.
              router.navigate('/');
            } catch {
              // Consistent with removeMember: a failed leave just leaves
              // the party open.
            }
          },
        },
      ]
    );
  };

  if (!activeParty) {
    return (
      <View
        style={[styles.screen, { backgroundColor: theme.colors.background }]}
      >
        <AppHeader />
        <View style={styles.placeholder}>
          <Text
            variant="bodyMedium"
            style={[styles.empty, { color: theme.colors.onSurfaceVariant }]}
          >
            Open a party from the Parties tab to see it here.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
    >
      <AppHeader />
      <FlatList
        style={styles.list}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        data={members}
        keyExtractor={(item) => item.partyMemberId}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text variant="headlineMedium">{activeParty.name}</Text>
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              You are {activeParty.role === 'organizer' ? 'the organizer' : 'a guest'} of
              this party.
              {activeParty.role === 'organizer' &&
                ' Each Share Party invite admits one guest.'}
            </Text>
            <View style={styles.actionRow}>
              {activeParty.role === 'organizer' ? (
                <Button
                  mode="contained"
                  icon="share-variant"
                  onPress={shareParty}
                >
                  Share Party
                </Button>
              ) : (
                <Button
                  mode="contained"
                  icon="logout"
                  buttonColor={theme.colors.error}
                  textColor={theme.colors.onError}
                  onPress={exitParty}
                >
                  Leave Party
                </Button>
              )}
            </View>
            {copiedInvite && (
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                Invitation copied to the clipboard.
              </Text>
            )}
            {shareError && (
              <Text variant="bodySmall" style={{ color: theme.colors.error }}>
                {shareError}
              </Text>
            )}
            <Text variant="titleMedium">Members</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Card mode="contained">
            <View style={styles.memberRow}>
              <Text selectable variant="titleSmall" style={styles.memberName}>
                {item.displayName}
              </Text>
              {item.userId === activeParty.organizerUserId && (
                <Chip compact>Organizer</Chip>
              )}
              {activeParty.role === 'organizer' &&
                item.userId !== activeParty.organizerUserId && (
                  <IconButton
                    icon="account-remove-outline"
                    onPress={() => dispatch(removeMember(item))}
                  />
                )}
            </View>
          </Card>
        )}
        ListEmptyComponent={
          <Text
            variant="bodyMedium"
            style={[styles.empty, { color: theme.colors.onSurfaceVariant }]}
          >
            No members yet. New joins will appear here in real time.
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  content: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    gap: Spacing.three,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  memberName: {
    flex: 1,
  },
  empty: {
    textAlign: 'center',
    paddingVertical: Spacing.four,
  },
});
