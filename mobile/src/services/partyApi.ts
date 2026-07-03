import { API_BASE_URL } from "@/constants/config";

// Mirrors the Party entity returned by the API (VPController).
export interface Party {
  partyId: string;
  name: string;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`HTTP ${response.status}${detail ? `: ${detail}` : ""}`);
  }

  return response.json();
}

export function createParty(name: string): Promise<Party> {
  return post<Party>("/VP/parties", { name });
}
