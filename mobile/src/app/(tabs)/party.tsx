import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  FlatList,
  Linking,
  Platform,
  Pressable,
  Share,
  StyleSheet,
} from 'react-native';

import AppHeader from '@/components/app-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { createInvitation } from '@/services/partyApi';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  addPendingVideo,
  clearPendingVideo,
  leaveParty,
  removeMember,
  selectActiveParty,
  videoRequested,
} from '@/store/partySlice';

export default function PartyScreen() {
  const theme = useTheme();
  const router = useRouter();
  const dispatch = useAppDispatch();

  const activeParty = useAppSelector(selectActiveParty);
  const members = useAppSelector((state) => state.party.members);
  const pendingVideoUrl = useAppSelector(
    (state) => state.party.pendingVideoUrl
  );
  const addingVideo = useAppSelector((state) => state.party.addingVideo);
  const addVideoError = useAppSelector((state) => state.party.addVideoError);

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

  // Opens the YouTube app when installed; otherwise the website. openURL
  // (not canOpenURL) because Android package-visibility rules make
  // canOpenURL report false for apps the manifest does not declare.
  const addVideo = async () => {
    if (!activeParty) return;
    // The share sheet gives the returning link no context; remembering the
    // party here is what lets ShareIntentHandler post it automatically.
    dispatch(videoRequested(activeParty.partyId));
    try {
      await Linking.openURL('vnd.youtube://');
    } catch {
      await Linking.openURL('https://www.youtube.com/');
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
      <ThemedView style={styles.screen}>
        <AppHeader />
        <ThemedView style={styles.placeholder}>
          <ThemedText themeColor="textSecondary" style={styles.empty}>
            Open a party from the Parties tab to see it here.
          </ThemedText>
          {pendingVideoUrl && (
            <ThemedText
              type="small"
              themeColor="textSecondary"
              style={styles.empty}
            >
              A video link is waiting: open a party to add it.
            </ThemedText>
          )}
        </ThemedView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.screen}>
      <AppHeader />
      <FlatList
        style={[styles.list, { backgroundColor: theme.background }]}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        data={members}
        keyExtractor={(item) => item.partyMemberId}
        ListHeaderComponent={
          <ThemedView style={styles.header}>
            <ThemedText type="title">{activeParty.name}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              You are {activeParty.role === 'organizer' ? 'the organizer' : 'a guest'} of
              this party.
              {activeParty.role === 'organizer' &&
                ' Each Share Party invite admits one guest.'}
            </ThemedText>
            <ThemedView style={styles.actionRow}>
              {activeParty.role === 'organizer' ? (
                <Pressable
                  onPress={shareParty}
                  style={({ pressed }) => [
                    styles.shareButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <ThemedText type="smallBold" style={styles.shareButtonLabel}>
                    Share Party
                  </ThemedText>
                </Pressable>
              ) : (
                <Pressable
                  onPress={exitParty}
                  style={({ pressed }) => [
                    styles.leaveButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <ThemedText type="smallBold" style={styles.shareButtonLabel}>
                    Leave Party
                  </ThemedText>
                </Pressable>
              )}
              <Pressable
                onPress={addVideo}
                style={({ pressed }) => [
                  styles.shareButton,
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText type="smallBold" style={styles.shareButtonLabel}>
                  Add Video
                </ThemedText>
              </Pressable>
            </ThemedView>
            {pendingVideoUrl && (
              <ThemedView type="backgroundElement" style={styles.pendingVideo}>
                <ThemedText type="small" style={styles.pendingVideoUrl}>
                  Video to add: {pendingVideoUrl}
                </ThemedText>
                <Pressable
                  onPress={() => dispatch(addPendingVideo())}
                  disabled={addingVideo}
                  hitSlop={Spacing.two}
                >
                  <ThemedText type="smallBold" style={styles.addAction}>
                    {addingVideo ? 'Adding…' : 'Add'}
                  </ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => dispatch(clearPendingVideo())}
                  disabled={addingVideo}
                  hitSlop={Spacing.two}
                >
                  <ThemedText type="small" themeColor="danger">
                    Dismiss
                  </ThemedText>
                </Pressable>
              </ThemedView>
            )}
            {addVideoError && (
              <ThemedText type="small" themeColor="danger">
                Could not add the video: {addVideoError}
              </ThemedText>
            )}
            {copiedInvite && (
              <ThemedText type="small" themeColor="textSecondary">
                Invitation copied to the clipboard.
              </ThemedText>
            )}
            {shareError && (
              <ThemedText type="small" themeColor="danger">
                {shareError}
              </ThemedText>
            )}
            <ThemedText type="subtitle">Members</ThemedText>
          </ThemedView>
        }
        renderItem={({ item }) => (
          <ThemedView type="backgroundElement" style={styles.memberRow}>
            <ThemedText selectable style={styles.memberName}>
              {item.displayName}
            </ThemedText>
            {item.userId === activeParty.organizerUserId && (
              <ThemedView type="backgroundSelected" style={styles.organizerBadge}>
                <ThemedText type="small" themeColor="textSecondary">
                  Organizer
                </ThemedText>
              </ThemedView>
            )}
            {activeParty.role === 'organizer' &&
              item.userId !== activeParty.organizerUserId && (
                <Pressable
                  onPress={() => dispatch(removeMember(item))}
                  hitSlop={Spacing.two}
                >
                  <ThemedText type="small" themeColor="danger">
                    Remove
                  </ThemedText>
                </Pressable>
              )}
          </ThemedView>
        )}
        ListEmptyComponent={
          <ThemedText themeColor="textSecondary" style={styles.empty}>
            No members yet. New joins will appear here in real time.
          </ThemedText>
        }
      />
    </ThemedView>
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
  shareButton: {
    backgroundColor: '#208AEF',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
    alignSelf: 'flex-start',
  },
  shareButtonLabel: {
    color: '#ffffff',
  },
  leaveButton: {
    backgroundColor: '#d93025',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
    alignSelf: 'flex-start',
  },
  pressed: {
    opacity: 0.7,
  },
  pendingVideo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    borderCurve: 'continuous',
  },
  pendingVideoUrl: {
    flex: 1,
  },
  addAction: {
    // Same accent as the action buttons above.
    color: '#208AEF',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
    borderCurve: 'continuous',
  },
  memberName: {
    flex: 1,
  },
  organizerBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.two,
  },
  empty: {
    textAlign: 'center',
    paddingVertical: Spacing.four,
  },
});
