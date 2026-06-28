import {
  HubConnection,
  HubConnectionBuilder,
  LogLevel,
} from "@microsoft/signalr";

class SignalRService {
  private connection: HubConnection | null = null;

  async connect() {
    this.connection = new HubConnectionBuilder()
      .withUrl("https://your-api.com/hubs/videoParty", {
        accessTokenFactory: () => "your-jwt-token",
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Information)
      .build();

    this.connection.onreconnecting((error) => {
      console.log("SignalR reconnecting", error);
    });

    this.connection.onreconnected((connectionId) => {
      console.log("SignalR connected again", connectionId);
    });

    this.connection.onclose((error) => {
      console.log("SignalR closed", error);
    });

    await this.connection.start();

    console.log("SignalR connected");
  }

  async send(method: string, ...args: any[]) {
    if (!this.connection) throw new Error("SignalR not connected");

    await this.connection.invoke(method, ...args);
  }

  on(event: string, callback: (...args: any[]) => void) {
    this.connection?.on(event, callback);
  }

  async disconnect() {
    await this.connection?.stop();

    this.connection = null;
  }
}

export default new SignalRService();
