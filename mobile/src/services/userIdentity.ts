import AsyncStorage from "@react-native-async-storage/async-storage";

import { API_BASE_URL } from "@/constants/config";

/**
 * Device-scoped identity and authentication. On first launch the app asks
 * for the user's name and registers with the API, receiving { userId,
 * secret }; name and credentials persist on the device. The secret is
 * exchanged for a short-lived JWT that authenticates every API and SignalR
 * call. Stands in for account-based auth — when accounts are added, only
 * how credentials are obtained changes; everything downstream keeps working.
 */

const CREDENTIALS_KEY = "videoparty.credentials";

interface DeviceCredentials {
  userId: string;
  secret: string;
  name: string;
}

interface AccessToken {
  token: string;
  /** Epoch milliseconds. */
  expiresAt: number;
}

// Cached as promises so concurrent callers share one storage read (or, for
// the token, one fetch) and never end up with two different identities.
let credentialsPromise: Promise<DeviceCredentials> | null = null;
let tokenPromise: Promise<AccessToken> | null = null;

// Listeners for identity resets (see fetchToken); the app layout subscribes
// to tell the user their previous identity is gone.
let identityResetListeners: (() => void)[] = [];

// Listeners for deliberate identity clears (see resetIdentity); the app
// layout subscribes to fall back to the registration screen.
let identityClearedListeners: (() => void)[] = [];

/**
 * Subscribes to identity resets: the server rejected this device's stored
 * credentials (e.g. the database was recreated) and a fresh identity was
 * registered in their place. Party memberships of the old identity are lost.
 * Returns an unsubscribe function for cleanup.
 */
export function onIdentityReset(listener: () => void): () => void {
  identityResetListeners.push(listener);
  return () => {
    identityResetListeners = identityResetListeners.filter(
      (l) => l !== listener
    );
  };
}

/**
 * Subscribes to deliberate identity clears (the user chose Reset identity):
 * the stored credentials are gone and the app should return to the
 * registration screen. Returns an unsubscribe function for cleanup.
 */
export function onIdentityCleared(listener: () => void): () => void {
  identityClearedListeners.push(listener);
  return () => {
    identityClearedListeners = identityClearedListeners.filter(
      (l) => l !== listener
    );
  };
}

/**
 * Discards this device's identity. The server-side user is left behind
 * untouched (nothing references it afterwards); the app registers a brand
 * new identity via the registration screen. Party memberships of the old
 * identity are lost.
 */
export async function resetIdentity(): Promise<void> {
  await AsyncStorage.removeItem(CREDENTIALS_KEY);
  credentialsPromise = null;
  tokenPromise = null;
  for (const listener of identityClearedListeners) {
    listener();
  }
}

/** Whether this device already has an identity. Gates the app on first
 * launch: everything below except register() requires one. */
export async function isRegistered(): Promise<boolean> {
  try {
    await getCredentials();
    return true;
  } catch {
    return false;
  }
}

/** Creates this device's identity under the given name (first launch). */
export async function register(name: string): Promise<void> {
  const registration = registerIdentity(name);
  // Share the in-flight registration so concurrent callers don't see the
  // "not registered" rejection from a stale load.
  credentialsPromise = registration;
  try {
    await registration;
  } catch (error) {
    credentialsPromise = null;
    throw error;
  }
}

/** Public identifier of this device's user (safe to show and compare). */
export function getUserId(): Promise<string> {
  return getCredentials().then((credentials) => credentials.userId);
}

/** The name the user registered under. */
export function getUserName(): Promise<string> {
  return getCredentials().then((credentials) => credentials.name);
}

/** Bearer token for API and SignalR calls; re-fetched near expiry. */
export async function getAccessToken(): Promise<string> {
  // No await between reading and assigning tokenPromise: a concurrent caller
  // must find this caller's in-flight fetch, not start a second one — two
  // fetches that both hit the 401 path would register two identities.
  let current = tokenPromise;
  if (!current) {
    current = tokenPromise = fetchToken();
    return awaitToken(current);
  }

  const cached = await current.catch(() => null);
  // 60s of slack so a token can't expire mid-request.
  if (cached && Date.now() < cached.expiresAt - 60_000) {
    return cached.token;
  }

  // Stale or failed; refresh unless a concurrent caller already has.
  if (tokenPromise === current || !tokenPromise) {
    tokenPromise = fetchToken();
  }
  return awaitToken(tokenPromise);
}

/** Drops the cached token, e.g. after a 401 from the API. */
export function invalidateAccessToken() {
  tokenPromise = null;
}

async function awaitToken(promise: Promise<AccessToken>): Promise<string> {
  try {
    return (await promise).token;
  } catch (error) {
    // Not cached: a failed fetch (e.g. API offline) retries on the next
    // call, unless a newer fetch already replaced this one.
    if (tokenPromise === promise) {
      tokenPromise = null;
    }
    throw error;
  }
}

async function fetchToken(): Promise<AccessToken> {
  const credentials = await getCredentials();
  let response = await requestToken(credentials);

  // 401 means the server no longer knows this identity (e.g. the dev
  // database was recreated). The stored credentials are useless, so discard
  // them, register a fresh identity under the same name and retry once.
  if (response.status === 401) {
    const registration = registerIdentity(credentials.name);
    credentialsPromise = registration;
    let fresh: DeviceCredentials;
    try {
      fresh = await registration;
    } catch (error) {
      credentialsPromise = null;
      throw error;
    }

    response = await requestToken(fresh);
    for (const listener of identityResetListeners) {
      listener();
    }
  }

  if (!response.ok) {
    throw new Error(`Token request failed: HTTP ${response.status}`);
  }

  const { accessToken, expiresAt } = await response.json();
  return { token: accessToken, expiresAt: Date.parse(expiresAt) };
}

function requestToken({ userId, secret }: DeviceCredentials) {
  return fetch(`${API_BASE_URL}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, secret }),
  });
}

async function registerIdentity(name: string): Promise<DeviceCredentials> {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });

  if (!response.ok) {
    throw new Error(`Registration failed: HTTP ${response.status}`);
  }

  const { userId, secret } = await response.json();
  const credentials: DeviceCredentials = { userId, secret, name };
  await AsyncStorage.setItem(CREDENTIALS_KEY, JSON.stringify(credentials));
  return credentials;
}

function getCredentials(): Promise<DeviceCredentials> {
  credentialsPromise ??= load();
  return credentialsPromise;
}

async function load(): Promise<DeviceCredentials> {
  try {
    const stored = await AsyncStorage.getItem(CREDENTIALS_KEY);
    if (!stored) {
      throw new Error("Device is not registered yet.");
    }
    return JSON.parse(stored);
  } catch (error) {
    // Not cached: registration or a later launch retries the read.
    credentialsPromise = null;
    throw error;
  }
}
