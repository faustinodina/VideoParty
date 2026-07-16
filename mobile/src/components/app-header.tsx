import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { UserBadge } from './user-badge';

import { Spacing } from '@/constants/theme';

/**
 * Top bar with the app brand and the signed-in user's name. NativeTabs has
 * no header of its own, so each screen renders this above its content. The
 * web build renders nothing (see app-header.web): its floating tab bar
 * already carries the brand and the badge.
 *
 * The bar is the one place the accent color is used as a background, which
 * is what sets it apart from the black/white screens under it.
 */
export default function AppHeader() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  return (
    <View
      style={[
        styles.bar,
        {
          paddingTop: insets.top + Spacing.two,
          backgroundColor: theme.colors.primary,
        },
      ]}
    >
      <Text
        variant="titleMedium"
        style={[styles.brand, { color: theme.colors.onPrimary }]}
      >
        VideoParty
      </Text>
      <UserBadge />
    </View>
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
  brand: {
    fontWeight: '700',
  },
});
