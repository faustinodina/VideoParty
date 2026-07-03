import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";

import { createParty as createPartyApi, Party } from "@/services/partyApi";
import signalR, { PartyGuest } from "@/services/signalRService";

interface PartyState {
  /** Party created by this client on the home screen, if any. */
  party: Party | null;
  creating: boolean;
  createError: string | null;
  /** Party whose SignalR group this client is currently listening to. */
  joinedPartyId: string | null;
  /** Guests received for the joined party during this session. */
  guests: PartyGuest[];
}

const initialState: PartyState = {
  party: null,
  creating: false,
  createError: null,
  joinedPartyId: null,
  guests: [],
};

// Creates the party on the API, then joins its SignalR group so this client
// receives the party's events (e.g. GuestRegistered).
export const createParty = createAsyncThunk(
  "party/create",
  async (name: string) => {
    const party = await createPartyApi(name);
    await signalR.joinParty(party.partyId);
    return party;
  }
);

// Joins an existing party's SignalR group (used by the Party screen).
export const joinParty = createAsyncThunk(
  "party/join",
  async (partyId: string) => {
    await signalR.joinParty(partyId);
    return partyId;
  }
);

const partySlice = createSlice({
  name: "party",
  initialState,
  reducers: {
    // Dispatched from the app-level SignalR subscription (see _layout).
    guestRegistered(state, action: PayloadAction<PartyGuest>) {
      // Guids from the API are lowercase; a hand-typed party id may not be.
      if (
        state.joinedPartyId &&
        action.payload.partyId.toLowerCase() ===
          state.joinedPartyId.toLowerCase()
      ) {
        state.guests.push(action.payload);
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createParty.pending, (state) => {
        state.creating = true;
        state.createError = null;
      })
      .addCase(createParty.fulfilled, (state, action) => {
        state.creating = false;
        state.party = action.payload;
        state.joinedPartyId = action.payload.partyId;
        state.guests = [];
      })
      .addCase(createParty.rejected, (state, action) => {
        state.creating = false;
        state.createError = action.error.message ?? "Something went wrong";
      })
      .addCase(joinParty.fulfilled, (state, action) => {
        state.joinedPartyId = action.payload;
        state.guests = [];
      });
  },
});

export const { guestRegistered } = partySlice.actions;
export default partySlice.reducer;
