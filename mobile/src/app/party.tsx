import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePartyGuests } from '@/hooks/usePartyGuests';

export default function PartyScreen() {
  const theme = useTheme();
  const [partyIdInput, setPartyIdInput] = useState('');
  const [joinedPartyId, setJoinedPartyId] = useState<string | null>(null);

  const guests = usePartyGuests(joinedPartyId);

  const join = () => {
    const trimmed = partyIdInput.trim();
    setJoinedPartyId(trimmed.length > 0 ? trimmed : null);
  };

  return (
    <FlatList
      style={[styles.list, { backgroundColor: theme.background }]}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      data={guests}
      keyExtractor={(item) => item.partyGuestId}
      ListHeaderComponent={
        <ThemedView style={styles.header}>
          <ThemedText type="subtitle">Party guests</ThemedText>
          <TextInput
            value={partyIdInput}
            onChangeText={setPartyIdInput}
            placeholder="Enter party id"
            placeholderTextColor={theme.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            style={[
              styles.input,
              { color: theme.text, backgroundColor: theme.backgroundElement },
            ]}
          />
          <Pressable
            onPress={join}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: theme.backgroundSelected, opacity: pressed ? 0.7 : 1 },
            ]}>
            <ThemedText type="link">
              {joinedPartyId ? 'Joined — listening for guests' : 'Join party'}
            </ThemedText>
          </Pressable>
        </ThemedView>
      }
      renderItem={({ item }) => (
        <ThemedView type="backgroundElement" style={styles.guestRow}>
          <ThemedText selectable>{item.guestName}</ThemedText>
        </ThemedView>
      )}
      ListEmptyComponent={
        <ThemedText themeColor="textSecondary" style={styles.empty}>
          {joinedPartyId
            ? 'No guests yet. New registrations will appear here in real time.'
            : 'Join a party to see guests as they register.'}
        </ThemedText>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  content: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.four,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    gap: Spacing.three,
  },
  input: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    borderCurve: 'continuous',
  },
  button: {
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    borderCurve: 'continuous',
    alignItems: 'center',
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
