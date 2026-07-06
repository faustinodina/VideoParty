import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import * as Device from "expo-device";

import {
  createParty as createPartyApi,
  getGuests,
  getUserParties,
  PartySummary,
  registerGuest,
} from "@/services/partyApi";
import signalR, { PartyGuest } from "@/services/signalRService";
import { getUserId } from "@/services/userIdentity";
import type { RootState } from "@/store";

interface PartyState {
  /** Parties where this device's user is organizer or guest. */
  parties: PartySummary[];
  loadingParties: boolean;
  partiesError: string | null;
  creating: boolean;
  createError: string | null;
  joining: boolean;
  joinError: string | null;
  /** Party currently open on the Party tab (its SignalR group is joined). */
  activePartyId: string | null;
  /** Guests received for the active party during this session. */
  guests: PartyGuest[];
}

const initialState: PartyState = {
  parties: [],
  loadingParties: false,
  partiesError: null,
  creating: false,
  createError: null,
  joining: false,
  joinError: null,
  activePartyId: null,
  guests: [],
};

export const fetchParties = createAsyncThunk("party/fetchAll", async () => {
  const userId = await getUserId();
  return getUserParties(userId);
});

// Creates the party on the API, then joins its SignalR group so this client
// receives the party's events (e.g. GuestRegistered).
export const createParty = createAsyncThunk(
  "party/create",
  async (name: string): Promise<PartySummary> => {
    const userId = await getUserId();
    const party = await createPartyApi(name, userId);
    await signalR.joinParty(party.partyId);
    return { partyId: party.partyId, name: party.name, role: "organizer" };
  }
);

// Registers this user as a guest of an existing party (so it shows up in the
// party list from now on), then joins its SignalR group.
export const joinParty = createAsyncThunk(
  "party/join",
  async (partyId: string, { dispatch }) => {
    const userId = await getUserId();
    const guestName = Device.deviceName ?? "Guest";
    const guest = await registerGuest(partyId, guestName, userId);
    await signalR.joinParty(guest.partyId);
    // The register response has no party name; refresh the list to get it.
    await dispatch(fetchParties());
    const guests = await getGuests(guest.partyId);
    return { partyId: guest.partyId, guests };
  }
);

// Opens a party the user already belongs to (tapping a row in the list).
export const openParty = createAsyncThunk(
  "party/open",
  async (partyId: string) => {
    await signalR.joinParty(partyId);
    const guests = await getGuests(partyId);
    return { partyId, guests };
  }
);

const partySlice = createSlice({
  name: "party",
  initialState,
  reducers: {
    // Dispatched from the app-level SignalR subscription (see _layout).
    guestRegistered(state, action: PayloadAction<PartyGuest>) {
      // Guids from the API are lowercase; a hand-typed party id may not be.
      // Skip guests already known from the fetched snapshot: a registration
      // can arrive over SignalR right after it was included in getGuests.
      if (
        state.activePartyId &&
        action.payload.partyId.toLowerCase() ===
          state.activePartyId.toLowerCase() &&
        !state.guests.some(
          (g) => g.partyGuestId === action.payload.partyGuestId
        )
      ) {
        state.guests.push(action.payload);
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchParties.pending, (state) => {
        state.loadingParties = true;
        state.partiesError = null;
      })
      .addCase(fetchParties.fulfilled, (state, action) => {
        state.loadingParties = false;
        state.parties = action.payload;
      })
      .addCase(fetchParties.rejected, (state, action) => {
        state.loadingParties = false;
        state.partiesError = action.error.message ?? "Something went wrong";
      })
      .addCase(createParty.pending, (state) => {
        state.creating = true;
        state.createError = null;
      })
      .addCase(createParty.fulfilled, (state, action) => {
        state.creating = false;
        state.parties.unshift(action.payload);
        state.activePartyId = action.payload.partyId;
        state.guests = [];
      })
      .addCase(createParty.rejected, (state, action) => {
        state.creating = false;
        state.createError = action.error.message ?? "Something went wrong";
      })
      .addCase(joinParty.pending, (state) => {
        state.joining = true;
        state.joinError = null;
      })
      .addCase(joinParty.fulfilled, (state, action) => {
        state.joining = false;
        state.activePartyId = action.payload.partyId;
        state.guests = action.payload.guests;
      })
      .addCase(joinParty.rejected, (state, action) => {
        state.joining = false;
        state.joinError = action.error.message ?? "Something went wrong";
      })
      .addCase(openParty.fulfilled, (state, action) => {
        // Always replace: re-opening the same party refreshes its guests.
        state.activePartyId = action.payload.partyId;
        state.guests = action.payload.guests;
      });
  },
});

export const selectActiveParty = (state: RootState) =>
  state.party.parties.find((p) => p.partyId === state.party.activePartyId) ??
  null;

export const { guestRegistered } = partySlice.actions;
export default partySlice.reducer;
