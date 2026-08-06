import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useTheme } from 'react-native-paper';

export default function AppTabs() {
  // The native tab bar can't render Paper components, but it takes the
  // Paper theme's colors: the same roles BottomNavigation would use (MD3
  // secondaryContainer pill, onSurface selected label).
  const theme = useTheme();

  return (
    <NativeTabs
      backgroundColor={theme.colors.background}
      indicatorColor={theme.colors.secondaryContainer}
      iconColor={{
        default: theme.colors.onSurfaceVariant,
        selected: theme.colors.onSecondaryContainer,
      }}
      labelStyle={{
        default: { color: theme.colors.onSurfaceVariant },
        selected: { color: theme.colors.onSecondaryContainer },
      }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Parties</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/home.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="videos">
        <NativeTabs.Trigger.Label>Videos</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/videos.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="party">
        <NativeTabs.Trigger.Label>Guests</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/explore.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
