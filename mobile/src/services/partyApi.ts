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
}

// Mirrors the PartyGuest entity returned by RegisterGuest.
export interface RegisteredGuest {
  partyGuestId: string;
  partyId: string;
  userId: string;
  guestName: string;
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

export function createParty(name: string, organizerUserId: string): Promise<Party> {
  return post<Party>("/VP/parties", { name, organizerUserId });
}

export function registerGuest(
  partyId: string,
  guestName: string,
  userId: string
): Promise<RegisteredGuest> {
  return post<RegisteredGuest>(`/VP/parties/${partyId}/guests`, {
    guestName,
    userId,
  });
}

export function getUserParties(userId: string): Promise<PartySummary[]> {
  return request<PartySummary[]>(`/VP/users/${userId}/parties`);
}

export function getGuests(partyId: string): Promise<RegisteredGuest[]> {
  return request<RegisteredGuest[]>(`/VP/parties/${partyId}/guests`);
}
