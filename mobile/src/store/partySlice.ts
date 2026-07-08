import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";

import {
  createParty as createPartyApi,
  getMembers,
  getUserParties,
  PartyMember,
  PartySummary,
  registerMember,
  removeMember as removeMemberApi,
} from "@/services/partyApi";
import signalR from "@/services/signalRService";
import { getUserName } from "@/services/userIdentity";
import type { RootState } from "@/store";

interface PartyState {
  /** Parties where this device's user is organizer or member. */
  parties: PartySummary[];
  loadingParties: boolean;
  partiesError: string | null;
  creating: boolean;
  createError: string | null;
  joining: boolean;
  joinError: string | null;
  /** Party currently open on the Party tab (its SignalR group is joined). */
  activePartyId: string | null;
  /** Members of the active party (fetched snapshot + live joins). */
  members: PartyMember[];
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
  members: [],
};


export const fetchParties = createAsyncThunk("party/fetchAll", () =>
  getUserParties()
);

// Creates the party on the API (which registers the organizer as its first
// member), then joins its SignalR group so this client receives the party's
// events (e.g. MemberJoined).
export const createParty = createAsyncThunk(
  "party/create",
  async (name: string) => {
    const party = await createPartyApi(name, await getUserName());
    await signalR.joinParty(party.partyId);
    const members = await getMembers(party.partyId);
    const summary: PartySummary = {
      partyId: party.partyId,
      name: party.name,
      role: "organizer",
      createdAt: party.createdAt,
      organizerUserId: party.organizerUserId,
    };
    return { summary, members };
  }
);

// Registers this user as a member of an existing party (so it shows up in
// the party list from now on), then joins its SignalR group.
export const joinParty = createAsyncThunk(
  "party/join",
  async (partyId: string, { dispatch }) => {
    const member = await registerMember(partyId, await getUserName());
    await signalR.joinParty(member.partyId);
    // The register response has no party name; refresh the list to get it.
    await dispatch(fetchParties());
    const members = await getMembers(member.partyId);
    return { partyId: member.partyId, members };
  }
);

// Organizer removes a member from the active party. The API broadcasts
// MemberRemoved to the party group, but the fulfilled reducer also removes
// the row locally so the organizer sees it go without the round trip.
export const removeMember = createAsyncThunk(
  "party/removeMember",
  async (member: PartyMember) => {
    await removeMemberApi(member.partyId, member.partyMemberId);
    return member;
  }
);

// Opens a party the user already belongs to (tapping a row in the list).
export const openParty = createAsyncThunk(
  "party/open",
  async (partyId: string) => {
    await signalR.joinParty(partyId);
    const members = await getMembers(partyId);
    return { partyId, members };
  }
);

const partySlice = createSlice({
  name: "party",
  initialState,
  reducers: {
    // Dispatched from the app-level SignalR subscription (see _layout).
    memberJoined(state, action: PayloadAction<PartyMember>) {
      // Guids from the API are lowercase; a hand-typed party id may not be.
      // Skip members already known from the fetched snapshot: a join can
      // arrive over SignalR right after it was included in getMembers.
      if (
        state.activePartyId &&
        action.payload.partyId.toLowerCase() ===
          state.activePartyId.toLowerCase() &&
        !state.members.some(
          (m) => m.partyMemberId === action.payload.partyMemberId
        )
      ) {
        state.members.push(action.payload);
      }
    },
    // Dispatched from the app-level SignalR subscription when someone else
    // was removed from a party. Filtering is idempotent, so the organizer
    // receiving the echo of their own removal is harmless.
    memberRemoved(state, action: PayloadAction<PartyMember>) {
      if (
        state.activePartyId &&
        action.payload.partyId.toLowerCase() ===
          state.activePartyId.toLowerCase()
      ) {
        state.members = state.members.filter(
          (m) => m.partyMemberId !== action.payload.partyMemberId
        );
      }
    },
    // This device's user was removed by the organizer: drop the party from
    // the list and close it if it is the one currently open.
    removedFromParty(state, action: PayloadAction<PartyMember>) {
      const partyId = action.payload.partyId.toLowerCase();
      state.parties = state.parties.filter(
        (p) => p.partyId.toLowerCase() !== partyId
      );
      if (state.activePartyId?.toLowerCase() === partyId) {
        state.activePartyId = null;
        state.members = [];
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
        state.parties.unshift(action.payload.summary);
        state.activePartyId = action.payload.summary.partyId;
        state.members = action.payload.members;
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
        state.members = action.payload.members;
      })
      .addCase(joinParty.rejected, (state, action) => {
        state.joining = false;
        state.joinError = action.error.message ?? "Something went wrong";
      })
      .addCase(removeMember.fulfilled, (state, action) => {
        state.members = state.members.filter(
          (m) => m.partyMemberId !== action.payload.partyMemberId
        );
      })
      .addCase(openParty.fulfilled, (state, action) => {
        // Always replace: re-opening the same party refreshes its members.
        state.activePartyId = action.payload.partyId;
        state.members = action.payload.members;
      });
  },
});

export const selectActiveParty = (state: RootState) =>
  state.party.parties.find((p) => p.partyId === state.party.activePartyId) ??
  null;

export const { memberJoined, memberRemoved, removedFromParty } =
  partySlice.actions;
export default partySlice.reducer;
