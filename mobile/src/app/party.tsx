import { useState } from 'react';
import { FlatList, Platform, Pressable, Share, StyleSheet } from 'react-native';

import AppHeader from '@/components/app-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { removeMember, selectActiveParty } from '@/store/partySlice';

export default function PartyScreen() {
  const theme = useTheme();
  const dispatch = useAppDispatch();

  const activeParty = useAppSelector(selectActiveParty);
  const members = useAppSelector((state) => state.party.members);

  // Web-only fallback feedback: set when the invitation was copied to the
  // clipboard because the browser has no share dialog.
  const [copiedInvite, setCopiedInvite] = useState(false);

  const shareParty = async () => {
    if (!activeParty) return;
    const message =
      `Join my party "${activeParty.name}" on VideoParty! ` +
      `Party id: ${activeParty.partyId}`;

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

  if (!activeParty) {
    return (
      <ThemedView style={styles.screen}>
        <AppHeader />
        <ThemedView style={styles.placeholder}>
          <ThemedText themeColor="textSecondary" style={styles.empty}>
            Open a party from the Parties tab to see it here.
          </ThemedText>
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
              this party. Share the id below so others can join.
            </ThemedText>
            <ThemedView type="backgroundElement" style={styles.idBox}>
              <ThemedText type="code" selectable>
                {activeParty.partyId}
              </ThemedText>
            </ThemedView>
            {activeParty.role === 'organizer' && (
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
            )}
            {copiedInvite && (
              <ThemedText type="small" themeColor="textSecondary">
                Invitation copied to the clipboard.
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
  idBox: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    borderCurve: 'continuous',
    alignSelf: 'flex-start',
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
  pressed: {
    opacity: 0.7,
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
