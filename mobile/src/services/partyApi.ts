import { API_BASE_URL } from "@/constants/config";
import {
  getAccessToken,
  invalidateAccessToken,
} from "@/services/userIdentity";

// Mirrors the Party entity returned by the API (VPController).
export interface Party {
  partyId: string;
  name: string;
  organizerUserId: string;
  /** ISO 8601 UTC, stamped by the API. */
  createdAt: string;
  updatedAt: string;
}

// Mirrors PartySummary returned by GET /VP/users/{userId}/parties.
export type PartyRole = "organizer" | "guest";

export interface PartySummary {
  partyId: string;
  name: string;
  role: PartyRole;
  /** ISO 8601 UTC creation time of the party; the API sorts by it, newest first. */
  createdAt: string;
  organizerUserId: string;
}

// Mirrors the PartyMember entity; also the MemberJoined SignalR payload,
// which the API broadcasts with the same shape.
export interface PartyMember {
  partyMemberId: string;
  partyId: string;
  userId: string;
  displayName: string;
  /** ISO 8601 UTC, stamped by the API. */
  createdAt: string;
  updatedAt: string;
}

// Attaches the bearer token; a 401 means it expired between the local expiry
// check and the server's, so refresh once and retry.
async function authorizedFetch(
  path: string,
  init?: RequestInit
): Promise<Response> {
  const send = async () =>
    fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        ...init?.headers,
        Authorization: `Bearer ${await getAccessToken()}`,
      },
    });

  let response = await send();
  if (response.status === 401) {
    invalidateAccessToken();
    response = await send();
  }
  return response;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await authorizedFetch(path, init);

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`HTTP ${response.status}${detail ? `: ${detail}` : ""}`);
  }

  return response.json();
}

function post<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// Separate from `request`: a successful DELETE is 204 with no body to parse.
async function del(path: string): Promise<void> {
  const response = await authorizedFetch(path, { method: "DELETE" });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`HTTP ${response.status}${detail ? `: ${detail}` : ""}`);
  }
}

// The caller's identity comes from the bearer token on every endpoint below;
// the API no longer accepts client-supplied user ids.
export function createParty(
  name: string,
  organizerName: string
): Promise<Party> {
  return post<Party>("/VP/parties", { name, organizerName });
}

export function registerMember(
  partyId: string,
  displayName: string
): Promise<PartyMember> {
  return post<PartyMember>(`/VP/parties/${partyId}/members`, {
    displayName,
  });
}

export function getUserParties(): Promise<PartySummary[]> {
  return request<PartySummary[]>("/VP/me/parties");
}

export function getMembers(partyId: string): Promise<PartyMember[]> {
  return request<PartyMember[]>(`/VP/parties/${partyId}/members`);
}

// Organizer-only on the API side.
export function removeMember(
  partyId: string,
  partyMemberId: string
): Promise<void> {
  return del(`/VP/parties/${partyId}/members/${partyMemberId}`);
}
