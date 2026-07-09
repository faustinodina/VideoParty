import { StyleSheet } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Spacing } from '@/constants/theme';
import { useUserName } from '@/hooks/use-user-name';

/** Pill showing who this device is signed in as; empty until the name loads. */
export function UserBadge() {
  const name = useUserName();

  if (!name) return null;

  return (
    <ThemedView type="backgroundSelected" style={styles.badge}>
      <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
        {name}
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.two,
    maxWidth: 160,
  },
});
