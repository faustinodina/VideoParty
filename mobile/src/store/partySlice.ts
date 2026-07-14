import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";

import {
  addVideo as addVideoApi,
  createParty as createPartyApi,
  getMembers,
  getUserParties,
  getVideos,
  leaveParty as leavePartyApi,
  PartyMember,
  PartySummary,
  PartyVideo,
  registerMember,
  removeMember as removeMemberApi,
  removeVideo as removeVideoApi,
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
  /** Playlist of the active party (fetched snapshot + live adds), in play order. */
  videos: PartyVideo[];
  /** Video link received via the Android share sheet, awaiting handling. */
  pendingVideoUrl: string | null;
  /**
   * Party whose Add Video button launched YouTube. The share sheet gives
   * the returning link no context of its own, so this is what binds it to
   * a party; a spontaneous share (not via Add Video) has none and falls
   * back to the active party.
   */
  videoTargetPartyId: string | null;
  addingVideo: boolean;
  addVideoError: string | null;
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
  videos: [],
  pendingVideoUrl: null,
  videoTargetPartyId: null,
  addingVideo: false,
  addVideoError: null,
};


// Inserts keeping play order (position, createdAt breaking ties, mirroring
// the API's ordering). Skips videos already known from the fetched snapshot:
// an add can arrive over SignalR right after it was included in getVideos.
function insertVideo(videos: PartyVideo[], video: PartyVideo) {
  if (videos.some((v) => v.partyVideoId === video.partyVideoId)) {
    return;
  }
  const index = videos.findIndex(
    (v) =>
      v.position > video.position ||
      (v.position === video.position && v.createdAt > video.createdAt)
  );
  if (index === -1) {
    videos.push(video);
  } else {
    videos.splice(index, 0, video);
  }
}

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
// the party list from now on), then joins its SignalR group. The invitation
// code comes from the organizer's share, identifies the party by itself,
// and is valid for one join only.
export const joinParty = createAsyncThunk(
  "party/join",
  async (invitationCode: string, { dispatch }) => {
    const member = await registerMember(invitationCode, await getUserName());
    await signalR.joinParty(member.partyId);
    // The register response has no party name; refresh the list to get it.
    await dispatch(fetchParties());
    const [members, videos] = await Promise.all([
      getMembers(member.partyId),
      getVideos(member.partyId),
    ]);
    return { partyId: member.partyId, members, videos };
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

// Removes a video from the active party's playlist — dispatched when the
// top video finishes playing on the TV (see the Videos tab). The API
// broadcasts VideoRemoved to the party group, but the fulfilled reducer
// also removes it locally so the advance does not wait for the echo.
export const removeVideo = createAsyncThunk(
  "party/removeVideo",
  async (video: PartyVideo) => {
    await removeVideoApi(video.partyId, video.partyVideoId);
    return video;
  }
);

// A guest abandons a party. The API broadcasts MemberRemoved (echoed back
// to this device too, harmlessly), but the fulfilled reducer cleans up
// locally so leaving works even if that echo is missed.
export const leaveParty = createAsyncThunk(
  "party/leave",
  async (partyId: string) => {
    await leavePartyApi(partyId);
    await signalR.leaveParty(partyId);
    return partyId;
  }
);

// Picks the party a shared link should be posted to: the one that launched
// Add Video when known, the open party otherwise.
const videoTargetParty = (state: RootState) =>
  state.party.videoTargetPartyId ?? state.party.activePartyId;

// Posts the share-sheet link to its target party's playlist. Dispatched
// automatically when the link arrives (see ShareIntentHandler in _layout)
// and by the pending banner's Add action. The pending link is cleared only
// on success (see the fulfilled reducer) so a failed post stays in the
// banner and can be retried.
export const addPendingVideo = createAsyncThunk(
  "party/addPendingVideo",
  async (_: void, { getState }) => {
    const state = getState() as RootState;
    const partyId = videoTargetParty(state);
    const { pendingVideoUrl } = state.party;
    if (!partyId || !pendingVideoUrl) {
      throw new Error("No pending video or no open party.");
    }
    return addVideoApi(partyId, pendingVideoUrl);
  },
  {
    // The automatic dispatch must not raise an error when there is simply
    // nothing to do yet: without a target party the link stays pending and
    // the banner keeps offering the manual Add.
    condition: (_, { getState }) => {
      const state = getState() as RootState;
      return Boolean(state.party.pendingVideoUrl && videoTargetParty(state));
    },
  }
);

// Opens a party the user already belongs to (tapping a row in the list).
export const openParty = createAsyncThunk(
  "party/open",
  async (partyId: string) => {
    await signalR.joinParty(partyId);
    const [members, videos] = await Promise.all([
      getMembers(partyId),
      getVideos(partyId),
    ]);
    return { partyId, members, videos };
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
    // Dispatched from the app-level SignalR subscription when any member
    // (including this device, echoed back harmlessly thanks to the dedupe
    // in insertVideo) adds a video to the open party.
    videoAdded(state, action: PayloadAction<PartyVideo>) {
      if (
        state.activePartyId &&
        action.payload.partyId.toLowerCase() ===
          state.activePartyId.toLowerCase()
      ) {
        insertVideo(state.videos, action.payload);
      }
    },
    // Dispatched from the app-level SignalR subscription when a video is
    // removed from the open party. Filtering is idempotent, so the
    // organizer receiving the echo of their own removal is harmless.
    videoRemoved(state, action: PayloadAction<PartyVideo>) {
      if (
        state.activePartyId &&
        action.payload.partyId.toLowerCase() ===
          state.activePartyId.toLowerCase()
      ) {
        state.videos = state.videos.filter(
          (v) => v.partyVideoId !== action.payload.partyVideoId
        );
      }
    },
    // Add Video is about to open YouTube for this party: remember it so the
    // link that comes back through the share sheet is posted to it, whatever
    // party happens to be open by then.
    videoRequested(state, action: PayloadAction<string>) {
      state.videoTargetPartyId = action.payload;
    },
    // A video link arrived through the share sheet (see ShareIntentHandler
    // in _layout, which follows this dispatch with addPendingVideo).
    videoShared(state, action: PayloadAction<string>) {
      state.pendingVideoUrl = action.payload;
      state.addVideoError = null;
    },
    clearPendingVideo(state) {
      state.pendingVideoUrl = null;
      state.videoTargetPartyId = null;
      state.addVideoError = null;
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
        state.videos = [];
      }
      // A shared link can no longer target a party the user is not in.
      if (state.videoTargetPartyId?.toLowerCase() === partyId) {
        state.videoTargetPartyId = null;
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
        // A brand-new party has nothing to fetch: its playlist is empty.
        state.videos = [];
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
        state.videos = action.payload.videos;
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
      .addCase(removeVideo.fulfilled, (state, action) => {
        state.videos = state.videos.filter(
          (v) => v.partyVideoId !== action.payload.partyVideoId
        );
      })
      .addCase(leaveParty.fulfilled, (state, action) => {
        // Same cleanup as removedFromParty: drop the party and close it if
        // it is the one currently open.
        const partyId = action.payload.toLowerCase();
        state.parties = state.parties.filter(
          (p) => p.partyId.toLowerCase() !== partyId
        );
        if (state.activePartyId?.toLowerCase() === partyId) {
          state.activePartyId = null;
          state.members = [];
          state.videos = [];
        }
        if (state.videoTargetPartyId?.toLowerCase() === partyId) {
          state.videoTargetPartyId = null;
        }
      })
      .addCase(addPendingVideo.pending, (state) => {
        state.addingVideo = true;
        state.addVideoError = null;
      })
      .addCase(addPendingVideo.fulfilled, (state, action) => {
        state.addingVideo = false;
        state.pendingVideoUrl = null;
        state.videoTargetPartyId = null;
        // Show the new video without waiting for the VideoAdded echo (which
        // insertVideo then deduplicates). Skipped when it was posted to a
        // party other than the open one.
        if (
          state.activePartyId &&
          action.payload.partyId.toLowerCase() ===
            state.activePartyId.toLowerCase()
        ) {
          insertVideo(state.videos, action.payload);
        }
      })
      .addCase(addPendingVideo.rejected, (state, action) => {
        state.addingVideo = false;
        state.addVideoError = action.error.message ?? "Something went wrong";
      })
      .addCase(openParty.fulfilled, (state, action) => {
        // Always replace: re-opening the same party refreshes its members
        // and playlist.
        state.activePartyId = action.payload.partyId;
        state.members = action.payload.members;
        state.videos = action.payload.videos;
      });
  },
});

export const selectActiveParty = (state: RootState) =>
  state.party.parties.find((p) => p.partyId === state.party.activePartyId) ??
  null;

export const {
  clearPendingVideo,
  memberJoined,
  memberRemoved,
  removedFromParty,
  videoAdded,
  videoRemoved,
  videoRequested,
  videoShared,
} = partySlice.actions;
export default partySlice.reducer;
