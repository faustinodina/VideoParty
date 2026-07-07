import AsyncStorage from "@react-native-async-storage/async-storage";

import { API_BASE_URL } from "@/constants/config";

/**
 * Device-scoped identity and authentication. On first launch the app
 * registers with the API and receives { userId, secret }; both persist on
 * the device. The secret is exchanged for a short-lived JWT that
 * authenticates every API and SignalR call. Stands in for account-based
 * auth — when accounts are added, only how credentials are obtained
 * changes; everything downstream keeps working.
 */

const CREDENTIALS_KEY = "videoparty.credentials";

interface DeviceCredentials {
  userId: string;
  secret: string;
}

interface AccessToken {
  token: string;
  /** Epoch milliseconds. */
  expiresAt: number;
}

// Cached as promises so concurrent callers on first launch share one
// registration request and never end up with two different identities.
let credentialsPromise: Promise<DeviceCredentials> | null = null;
let tokenPromise: Promise<AccessToken> | null = null;

/** Public identifier of this device's user (safe to show and compare). */
export function getUserId(): Promise<string> {
  return getCredentials().then((credentials) => credentials.userId);
}

/** Bearer token for API and SignalR calls; re-fetched near expiry. */
export async function getAccessToken(): Promise<string> {
  const cached = await settledToken();
  // 60s of slack so a token can't expire mid-request.
  if (cached && Date.now() < cached.expiresAt - 60_000) {
    return cached.token;
  }

  tokenPromise = fetchToken();
  try {
    return (await tokenPromise).token;
  } catch (error) {
    // Not cached: a failed fetch (e.g. API offline) retries on the next call.
    tokenPromise = null;
    throw error;
  }
}

/** Drops the cached token, e.g. after a 401 from the API. */
export function invalidateAccessToken() {
  tokenPromise = null;
}

async function settledToken(): Promise<AccessToken | null> {
  if (!tokenPromise) {
    return null;
  }
  try {
    return await tokenPromise;
  } catch {
    return null;
  }
}

async function fetchToken(): Promise<AccessToken> {
  const { userId, secret } = await getCredentials();

  const response = await fetch(`${API_BASE_URL}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, secret }),
  });

  if (!response.ok) {
    throw new Error(`Token request failed: HTTP ${response.status}`);
  }

  const { accessToken, expiresAt } = await response.json();
  return { token: accessToken, expiresAt: Date.parse(expiresAt) };
}

function getCredentials(): Promise<DeviceCredentials> {
  credentialsPromise ??= loadOrRegister();
  return credentialsPromise;
}

async function loadOrRegister(): Promise<DeviceCredentials> {
  try {
    const stored = await AsyncStorage.getItem(CREDENTIALS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }

    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
    });

    if (!response.ok) {
      throw new Error(`Registration failed: HTTP ${response.status}`);
    }

    const credentials: DeviceCredentials = await response.json();
    await AsyncStorage.setItem(CREDENTIALS_KEY, JSON.stringify(credentials));
    return credentials;
  } catch (error) {
    // Not cached: a failed registration retries on the next call.
    credentialsPromise = null;
    throw error;
  }
}
