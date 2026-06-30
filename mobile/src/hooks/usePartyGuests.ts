import { useEffect, useState } from "react";

import signalR, { PartyGuest } from "@/services/signalRService";

/**
 * Joins the SignalR group for `partyId` and listens for guests registered to
 * that party in real time. Returns the guests received during this session.
 *
 * Assumes the connection has already been started at app level (see _layout).
 * `joinParty` is idempotent and the service re-joins automatically after a
 * reconnect, so this hook only needs to join once per party.
 */
export function usePartyGuests(partyId: string | null) {
  const [guests, setGuests] = useState<PartyGuest[]>([]);

  useEffect(() => {
    if (!partyId) return;

    setGuests([]);

    const handler = (guest: PartyGuest) => {
      setGuests((prev) => [...prev, guest]);
    };

    const unsubscribe = signalR.onGuestRegistered(handler);
    signalR.joinParty(partyId);

    return () => {
      unsubscribe?.();
    };
  }, [partyId]);

  return guests;
}
