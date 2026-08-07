import * as Sentry from "@sentry/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "videoparty.sentry_enabled";

export async function getSentryEnabled(): Promise<boolean> {
  const value = await AsyncStorage.getItem(KEY);
  return value === "true";
}

export async function setSentryEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(KEY, enabled ? "true" : "false");
  applyConfig(enabled);
}

export async function initSentryFromPreference(): Promise<void> {
  applyConfig(await getSentryEnabled());
}

function applyConfig(enabled: boolean): void {
  Sentry.init({
    dsn: enabled ? process.env.EXPO_PUBLIC_SENTRY_DSN : undefined,
    tracesSampleRate: 1.0,
    debug: __DEV__,
  });
}
