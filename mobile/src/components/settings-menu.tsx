import Constants from 'expo-constants';
import { useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { Divider, IconButton, Menu, useTheme } from 'react-native-paper';

import { resetIdentity } from '@/services/userIdentity';

const version = Constants.expoConfig?.version ?? '?';
const commit = Constants.expoConfig?.extra?.gitCommit ?? '?';

/**
 * Gear button on the app header opening the settings menu. Holds app-level
 * actions that don't belong to any screen; more entries will join Reset
 * identity over time.
 */
export function SettingsMenu() {
  const theme = useTheme();
  const [visible, setVisible] = useState(false);

  // Resetting is destructive — the old identity's party memberships are
  // unreachable afterwards — so it asks for confirmation first.
  const confirmReset = () => {
    setVisible(false);
    Alert.alert(
      'Reset identity?',
      'This device will register as a new user with a new name. ' +
        'You will lose access to your parties unless you are invited again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => void resetIdentity(),
        },
      ]
    );
  };

  return (
    <Menu
      visible={visible}
      onDismiss={() => setVisible(false)}
      anchor={
        <IconButton
          icon="cog"
          size={20}
          iconColor={theme.colors.onPrimary}
          style={styles.button}
          onPress={() => setVisible(true)}
        />
      }
    >
      <Menu.Item
        leadingIcon="account-off"
        title="Reset identity"
        onPress={confirmReset}
      />
      <Divider />
      <Menu.Item
        leadingIcon="information-outline"
        title={`v${version} · ${commit}`}
        disabled
      />
    </Menu>
  );
}

const styles = StyleSheet.create({
  // IconButton's default margins would fatten the header bar; the bar's own
  // padding already provides the spacing.
  button: {
    margin: 0,
  },
});
