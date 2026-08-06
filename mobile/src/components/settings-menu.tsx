import Constants from 'expo-constants';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import {
  Button,
  Dialog,
  Divider,
  IconButton,
  Menu,
  Portal,
  Text,
  useTheme,
} from 'react-native-paper';

import { API_BASE_URL } from '@/constants/config';
import { resetIdentity } from '@/services/userIdentity';

interface BuildVersion {
  version: string;
  commit: string;
}

const clientVersion = Constants.expoConfig?.version ?? '?';
const clientCommit = (Constants.expoConfig?.extra?.gitCommit as string | undefined) ?? '?';

export function SettingsMenu() {
  const theme = useTheme();
  const [menuVisible, setMenuVisible] = useState(false);
  const [aboutVisible, setAboutVisible] = useState(false);
  const [serverVersion, setServerVersion] = useState<BuildVersion | null>(null);
  const [serverError, setServerError] = useState(false);

  const openAbout = async () => {
    setMenuVisible(false);
    setServerVersion(null);
    setServerError(false);
    setAboutVisible(true);
    try {
      const res = await fetch(`${API_BASE_URL}/VP/version`);
      setServerVersion(await res.json());
    } catch {
      setServerError(true);
    }
  };

  // Resetting is destructive — the old identity's party memberships are
  // unreachable afterwards — so it asks for confirmation first.
  const confirmReset = () => {
    setMenuVisible(false);
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

  const serverVersionText = serverError
    ? 'unavailable'
    : (serverVersion?.version ?? 'loading…');
  const serverCommitText = serverError ? '' : (serverVersion?.commit ?? '');

  return (
    <>
      <Menu
        visible={menuVisible}
        onDismiss={() => setMenuVisible(false)}
        anchor={
          <IconButton
            icon="cog"
            size={20}
            iconColor={theme.colors.onPrimary}
            style={styles.button}
            onPress={() => setMenuVisible(true)}
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
          title="About"
          onPress={() => void openAbout()}
        />
      </Menu>
      <Portal>
        <Dialog visible={aboutVisible} onDismiss={() => setAboutVisible(false)}>
          <Dialog.Title>About VideoParty</Dialog.Title>
          <Dialog.Content>
            <View style={styles.row}>
              <Text variant="bodySmall" style={styles.label}>App</Text>
              <Text variant="bodySmall" style={styles.cell}>v{clientVersion}</Text>
              <Text variant="bodySmall" style={styles.cell}>{clientCommit}</Text>
            </View>
            <View style={styles.row}>
              <Text variant="bodySmall" style={styles.label}>Server</Text>
              <Text variant="bodySmall" style={styles.cell}>{serverVersionText}</Text>
              <Text variant="bodySmall" style={styles.cell}>{serverCommitText}</Text>
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setAboutVisible(false)}>Close</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    margin: 0,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 3,
  },
  label: {
    width: 52,
    opacity: 0.5,
  },
  cell: {
    flex: 1,
  },
});
