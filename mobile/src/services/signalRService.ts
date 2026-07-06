import {
  HubConnection,
  HubConnectionBuilder,
  LogLevel,
} from "@microsoft/signalr";

import { HUB_URL } from "@/constants/config";

// Mirrors the GuestRegistered payload broadcast by the API (VPController.RegisterGuest).
export interface PartyGuest {
  partyGuestId: string;
  partyId: string;
  userId: string;
  guestName: string;
}

class SignalRService {
  private connection: HubConnection | null = null;
  // Remembered so we can re-join the party group after an automatic reconnect.
  private currentPartyId: string | null = null;
  // Handlers registered before connect(): the HubConnection doesn't exist
  // yet at that point, so they are queued here and applied in connect().
  private handlers: Array<[string, (...args: any[]) => void]> = [];

  async connect() {
    console.log("SignalR connecting to", HUB_URL);

    this.connection = new HubConnectionBuilder()
      .withUrl(HUB_URL, {
        accessTokenFactory: () => "your-jwt-token",
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Information)
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
  // (e.g. GuestRegistered). Safe to call before/after connecting.
  async joinParty(partyId: string) {
    this.currentPartyId = partyId;

    if (this.connection?.state === "Connected") {
      await this.connection.invoke("JoinParty", partyId);
    }
  }

  private async rejoinCurrentParty() {
    if (this.currentPartyId && this.connection?.state === "Connected") {
      await this.connection.invoke("JoinParty", this.currentPartyId);
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

  // Strongly-typed convenience subscription for the GuestRegistered event.
  // Returns an unsubscribe function for cleanup.
  onGuestRegistered(callback: (guest: PartyGuest) => void) {
    this.on("GuestRegistered", callback);
    return () => this.off("GuestRegistered", callback);
  }

  async disconnect() {
    await this.connection?.stop();

    this.connection = null;
    this.currentPartyId = null;
  }
}

export default new SignalRService();
