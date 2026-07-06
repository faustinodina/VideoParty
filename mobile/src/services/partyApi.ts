import { API_BASE_URL } from "@/constants/config";

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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, init);

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

export function createParty(
  name: string,
  organizerUserId: string,
  organizerName: string
): Promise<Party> {
  return post<Party>("/VP/parties", { name, organizerUserId, organizerName });
}

export function registerMember(
  partyId: string,
  displayName: string,
  userId: string
): Promise<PartyMember> {
  return post<PartyMember>(`/VP/parties/${partyId}/members`, {
    displayName,
    userId,
  });
}

export function getUserParties(userId: string): Promise<PartySummary[]> {
  return request<PartySummary[]>(`/VP/users/${userId}/parties`);
}

export function getMembers(partyId: string): Promise<PartyMember[]> {
  return request<PartyMember[]>(`/VP/parties/${partyId}/members`);
}
