VideoParty

Full-stack mobile app (Expo/React Native + .NET 10 Web API) enabling real-time collaborative YouTube queue management via SignalR; 
guests join by SMS invite, submit videos from their phones to a shared playlist, and cast it to a Smart TV via Google Cast 
— built with Claude Code.

Full technology list:

  Backend
  - ASP.NET Core (.NET 10) — Web API
  - SignalR — real-time messaging
  - Entity Framework Core 10 — ORM
  - SQLite — database
  - JWT Bearer — authentication
  - OpenAPI / Swagger UI — API docs
  - Fly.io — cloud deployment

  Mobile
  - React Native 0.85 + Expo 56 — app framework
  - Expo Router — file-based navigation
  - TypeScript
  - Redux Toolkit — state management
  - React Native Google Cast — Google Cast / Smart TV integration
  - React Native Paper (Material Design 3) — UI components
  - @microsoft/signalr — real-time client
  - AsyncStorage — local persistence
  - expo-share-intent — share YouTube links from outside the app