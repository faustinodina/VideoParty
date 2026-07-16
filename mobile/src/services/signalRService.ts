import {
  HubConnection,
  HubConnectionBuilder,
  ILogger,
  LogLevel,
} from "@microsoft/signalr";

import { HUB_URL } from "@/constants/config";
import type { PartyMember, PartyVideo } from "@/services/partyApi";
import { getAccessToken } from "@/services/userIdentity";

// The library logs transient websocket drops via console.error, which LogBox
// turns into a full-screen error in dev builds — even though automatic
// reconnection recovers moments later. Route everything through console.log
// so expected disconnects inform instead of alarm.
const logger: ILogger = {
  log(logLevel: LogLevel, message: string) {
    if (logLevel >= LogLevel.Information) {
      console.log(message);
    }
  },
};

// A TV playback failure reported by the organizer's phone and relayed by
// the API to the rest of the party (see onPlaybackIssue).
export interface PlaybackIssue {
  partyId: string;
  message: string;
}

class SignalRService {
  private connection: HubConnection | null = null;
  // Remembered so we can re-join the party group after an automatic reconnect.
  private currentPartyId: string | null = null;
  // Handlers registered before connect(): the HubConnection doesn't exist
  // yet at that point, so they are queued here and applied in connect().
  private handlers: [string, (...args: any[]) => void][] = [];

  async connect() {
    console.log("SignalR connecting to", HUB_URL);

    this.connection = new HubConnectionBuilder()
      .withUrl(HUB_URL, {
        // Sent as ?access_token=… on WebSocket requests; the API's JWT
        // bearer setup reads it from there for hub paths.
        accessTokenFactory: () => getAccessToken(),
      })
      .withAutomaticReconnect()
      .configureLogging(logger)
      .build();

    for (const [event, callback] of this.handlers) {
      this.connection.on(event, callback);
    }

    this.connection.onreconnecting((error) => {
      console.log("SignalR reconnecting", error);
    });

    this.connection.onreconnected(async (connectionId) => {
      console.log("SignalR connected again", connectionId);
      // Group membership is tied to the connection id, which changes on
      // reconnect, so re-join the party group to keep receiving its events.
      await this.rejoinCurrentParty();
    });

    this.connection.onclose((error) => {
      console.log("SignalR closed", error);
    });

    await this.connection.start();

    console.log("SignalR connected");

    // Flush a party join requested before the connection finished starting.
    await this.rejoinCurrentParty();
  }

  // Join a party group so this client receives that party's events
  // (e.g. MemberJoined). Safe to call before/after connecting.
  async joinParty(partyId: string) {
    this.currentPartyId = partyId;

    if (this.connection?.state === "Connected") {
      await this.connection.invoke("JoinParty", partyId);
    }
  }

  // Leave a party group after losing membership (e.g. removed by the
  // organizer). Also forgets the party so an automatic reconnect doesn't
  // silently re-join its group.
  async leaveParty(partyId: string) {
    if (this.currentPartyId?.toLowerCase() === partyId.toLowerCase()) {
      this.currentPartyId = null;
    }

    if (this.connection?.state === "Connected") {
      await this.connection.invoke("LeaveParty", partyId);
    }
  }

  private async rejoinCurrentParty() {
    if (this.currentPartyId && this.connection?.state === "Connected") {
      await this.connection.invoke("JoinParty", this.currentPartyId);
    }
  }

  // Tells the rest of the party why the TV skipped or stopped (the API
  // relays to everyone in the group but this client). Quietly does nothing
  // while disconnected: the organizer already sees the error locally, and
  // a failure to share it must not disturb the cast error handling.
  async reportPlaybackIssue(partyId: string, message: string) {
    if (this.connection?.state === "Connected") {
      await this.connection.invoke("ReportPlaybackIssue", partyId, message);
    }
  }

  async send(method: string, ...args: any[]) {
    if (!this.connection) throw new Error("SignalR not connected");

    await this.connection.invoke(method, ...args);
  }

  on(event: string, callback: (...args: any[]) => void) {
    this.handlers.push([event, callback]);
    this.connection?.on(event, callback);
  }

  off(event: string, callback: (...args: any[]) => void) {
    this.handlers = this.handlers.filter(
      ([e, cb]) => e !== event || cb !== callback
    );
    this.connection?.off(event, callback);
  }

  // Strongly-typed convenience subscription for the MemberJoined event,
  // broadcast by the API with the same shape as the PartyMember entity.
  // Returns an unsubscribe function for cleanup.
  onMemberJoined(callback: (member: PartyMember) => void) {
    this.on("MemberJoined", callback);
    return () => this.off("MemberJoined", callback);
  }

  // Broadcast by the API when the organizer removes a member; the payload is
  // the removed member, same PartyMember shape as MemberJoined.
  onMemberRemoved(callback: (member: PartyMember) => void) {
    this.on("MemberRemoved", callback);
    return () => this.off("MemberRemoved", callback);
  }

  // Broadcast by the API when a member adds a video to the party's
  // playlist; the payload has the same shape as the PartyVideo entity.
  onVideoAdded(callback: (video: PartyVideo) => void) {
    this.on("VideoAdded", callback);
    return () => this.off("VideoAdded", callback);
  }

  // Broadcast by the API when a video is removed from the playlist (most
  // commonly the top one finishing on the TV); the payload is the removed
  // video, same PartyVideo shape as VideoAdded.
  onVideoRemoved(callback: (video: PartyVideo) => void) {
    this.on("VideoRemoved", callback);
    return () => this.off("VideoRemoved", callback);
  }

  // Broadcast by the API when the organizer's phone reports a TV playback
  // failure (see reportPlaybackIssue); not echoed back to the reporter.
  onPlaybackIssue(callback: (issue: PlaybackIssue) => void) {
    this.on("PlaybackIssue", callback);
    return () => this.off("PlaybackIssue", callback);
  }

  async disconnect() {
    await this.connection?.stop();

    this.connection = null;
    this.currentPartyId = null;
  }
}

export default new SignalRService();
