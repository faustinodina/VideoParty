import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

import { Spacing } from '@/constants/theme';
import { useUserName } from '@/hooks/use-user-name';

/**
 * Pill showing who this device is signed in as; empty until the name loads.
 * Frosted white so it reads on the header's brand-blue bar.
 */
export function UserBadge() {
  const name = useUserName();
  const theme = useTheme();

  if (!name) return null;

  return (
    <View style={styles.badge}>
      <Text
        variant="labelMedium"
        numberOfLines={1}
        style={{ color: theme.colors.onPrimary }}
      >
        {name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.two,
    maxWidth: 160,
  },
});
