import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { UserBadge } from './user-badge';

import { Spacing } from '@/constants/theme';

/**
 * Top bar with the app brand and the signed-in user's name. NativeTabs has
 * no header of its own, so each screen renders this above its content. The
 * web build renders nothing (see app-header.web): its floating tab bar
 * already carries the brand and the badge.
 */
export default function AppHeader() {
  const insets = useSafeAreaInsets();

  return (
    <ThemedView style={[styles.bar, { paddingTop: insets.top + Spacing.two }]}>
      <ThemedText type="smallBold">VideoParty</ThemedText>
      <UserBadge />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
  },
});
