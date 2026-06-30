/**
 * Runtime configuration sourced from Expo public env vars.
 *
 * `EXPO_PUBLIC_*` variables are inlined into the client bundle at build time
 * and are therefore NOT secret — only put non-sensitive values here.
 *
 * Set the value in `.env` (committed default) or override per-developer in
 * `.env.local` (git-ignored), e.g.
 *   EXPO_PUBLIC_API_URL=http://192.168.1.50:5070
 *
 * Note: `localhost` resolves to the device itself, so a physical phone needs
 * your machine's LAN IP, not localhost.
 */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:5071";

export const HUB_URL = `${API_BASE_URL.replace(/\/$/, "")}/hubs/user`;
