import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";

/**
 * Device-scoped user identity: a GUID generated on first launch and persisted
 * on the device. Sent with create/join calls so the API can associate parties
 * with this "user". Stands in for real auth — when accounts are added, the
 * id handed out here just gets replaced by the authenticated user's id.
 */

const STORAGE_KEY = "videoparty.userId";

// Cached as a promise so concurrent callers on first launch share one
// storage read and never generate two different ids.
let userIdPromise: Promise<string> | null = null;

export function getUserId(): Promise<string> {
  userIdPromise ??= loadOrCreateUserId();
  return userIdPromise;
}

async function loadOrCreateUserId(): Promise<string> {
  const existing = await AsyncStorage.getItem(STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const userId = Crypto.randomUUID();
  await AsyncStorage.setItem(STORAGE_KEY, userId);
  return userId;
}
