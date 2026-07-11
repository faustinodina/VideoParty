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

// Mirrors the PartyVideo entity; also the VideoAdded SignalR payload,
// which the API broadcasts with the same shape.
export interface PartyVideo {
  partyVideoId: string;
  partyId: string;
  addedByUserId: string;
  url: string;
  /** Playlist order; lower plays first, gaps allowed. */
  position: number;
  /** ISO 8601 UTC, stamped by the API. */
  createdAt: string;
  updatedAt: string;
}

// Mirrors PartyInvitation returned by POST /VP/parties/{partyId}/invitations.
export interface PartyInvitation {
  partyId: string;
  /** Short uppercase code, e.g. "K7MWPX2A"; joining needs only this. */
  invitationId: string;
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

// Organizer-only: mints a single-use invitation id for the party. Each call
// returns a fresh id; it is consumed by the first registerMember that uses it.
export function createInvitation(partyId: string): Promise<PartyInvitation> {
  return post<PartyInvitation>(`/VP/parties/${partyId}/invitations`, {});
}

// The code identifies the party it was minted for; the joined party comes
// back in the response.
export function registerMember(
  invitationCode: string,
  displayName: string
): Promise<PartyMember> {
  return post<PartyMember>(`/VP/invitations/${invitationCode}/members`, {
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

// The party's playlist in play order.
export function getVideos(partyId: string): Promise<PartyVideo[]> {
  return request<PartyVideo[]>(`/VP/parties/${partyId}/videos`);
}

// Appends a video to the party's playlist. Any member of the party may add.
export function addVideo(partyId: string, url: string): Promise<PartyVideo> {
  return post<PartyVideo>(`/VP/parties/${partyId}/videos`, { url });
}

// The caller removes themself from the party. Rejected for the organizer.
export function leaveParty(partyId: string): Promise<void> {
  return del(`/VP/parties/${partyId}/members/me`);
}
