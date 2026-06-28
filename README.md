# VideoParty

VideoParty lets a group of people build and watch a shared video playlist together. An **organizer** creates a party, invites guests by SMS, and guests contribute YouTube videos from their phones. A designated **master** phone plays the queue for everyone in the room — no accounts or logins required.

## How it works

- **Organizer** creates a Video Party from the app. No login needed. Creation generates two tokens:
  - `TK1` — identifies the party instance
  - `TK2m` — identifies the organizer (authenticated by `TK1` + `TK2m`)
- The organizer generates a unique invitation token (`TK1` + `TK2n`) per guest and sends it via SMS.
- A **guest** uses the app to join the party with their invitation token.
- A guest shares a YouTube video through the app:
  1. The app sends `videoID` + `TK1` + `TK2n` to the server.
  2. The server routes the request to the **master** phone.
  3. The master adds the `videoID` to the playing list.

### Roles

| Role | Description |
| --- | --- |
| Organizer | Creates the party and invites guests |
| Guest | Joins via invitation and shares videos |
| Master | The phone that plays the shared queue |
| Server | Routes messages between participants |

## Tech stack

- **Backend:** ASP.NET Core Web API (.NET 10) with [SignalR](https://learn.microsoft.com/aspnet/core/signalr/introduction) for real-time messaging and OpenAPI for API docs.
- **Mobile app:** planned (see `mobile/`).

## Project structure

```
VideoParty/
├── VideoParty.Api/        # ASP.NET Core backend
│   ├── Controllers/       # HTTP endpoints
│   ├── Hubs/              # SignalR hubs (real-time messaging)
│   └── Program.cs         # App startup & service configuration
├── mobile/                # Mobile app (planned)
├── docs/                  # Design notes
└── VideoParty.slnx        # Solution file
```

The SignalR hub is mapped at `/hubs/user`.

## Getting started

### Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/download)

### Run the API

```bash
cd VideoParty.Api
dotnet run
```

In development, OpenAPI is available at `/openapi/v1.json`. See `VideoParty.Api/VideoParty.Api.http` for sample requests.

## Status

Early development. The backend scaffolding (Web API + SignalR hub) is in place; party/invitation logic and the mobile app are not yet implemented.
