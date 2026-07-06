import { FlatList, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAppSelector } from '@/store/hooks';
import { selectActiveParty } from '@/store/partySlice';

export default function PartyScreen() {
  const theme = useTheme();

  const activeParty = useAppSelector(selectActiveParty);
  const guests = useAppSelector((state) => state.party.guests);

  if (!activeParty) {
    return (
      <ThemedView style={styles.placeholder}>
        <ThemedText themeColor="textSecondary" style={styles.empty}>
          Open a party from the Parties tab to see it here.
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <FlatList
      style={[styles.list, { backgroundColor: theme.background }]}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      data={guests}
      keyExtractor={(item) => item.partyGuestId}
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
          <ThemedText type="subtitle">Party guests</ThemedText>
        </ThemedView>
      }
      renderItem={({ item }) => (
        <ThemedView type="backgroundElement" style={styles.guestRow}>
          <ThemedText selectable>{item.guestName}</ThemedText>
        </ThemedView>
      )}
      ListEmptyComponent={
        <ThemedText themeColor="textSecondary" style={styles.empty}>
          No guests yet. New registrations will appear here in real time.
        </ThemedText>
      }
    />
  );
}

const styles = StyleSheet.create({
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
  guestRow: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
    borderCurve: 'continuous',
  },
  empty: {
    textAlign: 'center',
    paddingVertical: Spacing.four,
  },
});
