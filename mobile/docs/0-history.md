# History

## 7/11/2026

### The PartyVideo entity is in place and the PartyVideos table now exists in the dev database

What I created:

- VideoParty.Model\Models\PartyVideo.cs — follows the same shape as the other entities (required Guid PK, Party navigation, ITimestamped for the auto-stamped CreatedAt/UpdatedAt). Its fields:
  - Url — the video link as shared (currently the YouTube URLs arriving via the share sheet, matching the client's pendingVideoUrl)
  - AddedByUserId — device-generated user id of the member who added it, same pattern as Party.OrganizerUserId
  - Position — playlist order; lower plays first, gaps allowed so inserts don't require renumbering
- ApplicationDbContext — added the PartyVideos DbSet plus a (PartyId, Position) index, since playlists are always read per party in play order. The existing UTC converter and timestamp stamping pick the new entity up automatically.
- Migration 20260711204033_AddPartyVideos — creates the table with a cascade-delete FK to Parties, and I applied it to the dev database.

  One design choice worth flagging: I kept Url as the raw shared link rather than extracting a YouTube video id, since the entity shouldn't assume YouTube forever — parsing/validation can live in the controller when the add-video endpoint is built. Natural next steps
  when you're ready: an endpoint to post the pending video into a party, and a hub event so members see playlist changes live.

### The shared link can now be posted to the server

Server (VPController.cs):

- POST /VP/parties/{partyId}/videos — any party member (organizer or guest) can add; non-members get 403. The URL is validated as an absolute URI, and the video is appended with Position = max + 1 (concurrent ties are harmless since Position only orders). Following the pattern of the member endpoints, it broadcasts a VideoAdded SignalR event to the party group — no client listens yet, but it's ready for the playlist UI.
- GET /VP/parties/{partyId}/videos/{id} — single-video lookup backing the 201 Created location.

Client:

- partyApi.ts — PartyVideo interface and addVideo(partyId, url).
- partySlice.ts — new addPendingVideo thunk posts pendingVideoUrl to the active party. The pending link is cleared only on success, so a failed post stays in the banner and can be retried; the error lands in addVideoError.
- party.tsx — the pending-video banner now has an Add action (accent-colored, shows "Adding…" while in flight) next to the existing Dismiss, with the error message shown beneath on failure.

One deliberate choice: posting is an explicit tap on "Add" rather than automatic on arrival — a guest can belong to several parties, and auto-posting to whichever happens to be open risked sending the link to the wrong one. If you'd rather have it post automatically
when a party is already open, that's a small change to the share handler.

### Done — posting is now automatic on arrival, and the party context travels with the flow. Typecheck passes

the context doesn't need to be in the link: the moment the user leaves for YouTube is our own Add
Video button, so the party is captured there instead. Concretely:

- videoTargetPartyId (new in partySlice) — set by the new videoRequested action when Add Video is tapped, before YouTube opens. This is the "PartyID context" for the link that comes back. It's cleared once the video posts, when the banner is dismissed, and if the user
  leaves or is removed from that party (a post there would just be rejected with 403).
- ShareIntentHandler (\_layout.tsx) — on arrival it now dispatches addPendingVideo() right after storing the link, so the post happens immediately. The thunk posts to videoTargetPartyId when set, falling back to the currently open party for spontaneous shares that
  didn't start from Add Video.
- No party at all — the thunk has a condition that makes the automatic dispatch a silent no-op instead of an error; the link stays pending with the existing banner and hint, and the manual Add/Dismiss actions remain as the fallback (also used for retrying after a
  failed post).

  One limitation worth knowing: the target lives in Redux, so if Android kills the app process while the user is in YouTube, the context is lost — the share still arrives, but it falls back to the pending banner. If that turns out to matter in practice, the target could
  be persisted to storage.

  Committed as 8c99405

### The Videos tab is in place — API builds clean and the mobile typecheck passes

What was added:

Server — GET /VP/parties/{partyId}/videos returns the playlist ordered by Position (with CreatedAt breaking the ties concurrent adds can produce).

Client state (partySlice) — a videos array for the active party, loaded together with members when joining or opening a party (a newly created party just starts empty). It stays live two ways: the new VideoAdded SignalR event is bridged into the store in \_layout.tsx
(so everyone in the party sees new videos in real time), and a successful auto-post inserts its own result immediately without waiting for the echo — insertion dedupes by id and keeps play order, mirroring the server's sort.

Videos tab (videos.tsx + trigger in app-tabs.tsx) — shows the active party's playlist with "added by <member>" per row (falling back to "a former member" if the adder left); tapping a row opens the link in YouTube until in-party playback exists. The Add Video button
and the pending-link banner moved here from the Party screen, which is now purely members/administration. The share handler also lands on /videos instead of /party after a share. For the tab bar I generated a play-button icon (videos.png at 1x/2x/3x) with the same
style and sizes as the existing template icons.

Two things to note when you try it: restart Metro with --clear since a new route file was added (stale cache would otherwise break the /videos route), and the icon is a programmatically drawn placeholder — easy to swap if you have better art.

Committed as b6fbfe6

### The playlist now shows the same preview other apps do. Both builds pass, and I smoke-tested the real endpoint: YouTube's oEmbed returned the title and hqdefault.jpg thumbnail for a test link

How it works, per your question: apps get that preview either from Open Graph tags on the page or from the provider's oEmbed endpoint. For YouTube, oEmbed is the clean option — <https://www.youtube.com/oembed?url=><video-url>&format=json returns the title and thumbnail
URL with no API key, and it works for youtu.be share links too. I put the fetch on the server at add-time rather than in the app, so it's fetched once, stored with the video, and every member gets it from our API.

The changes:

- PartyVideo gained nullable Title and ThumbnailUrl columns (migration AddVideoMetadata, already applied to the dev DB — existing rows just have nulls).
- VPController.AddVideo calls the oEmbed endpoint through a named HttpClient (registered in Program.cs with a 5-second timeout) before saving. It's strictly best-effort: a non-YouTube link, timeout, or provider error means the video saves without metadata rather than
  failing the add. Both fields ride along in the VideoAdded broadcast.
- Videos tab rows are now horizontal: a 96×54 thumbnail (via expo-image, which the app already had) next to the bold title and the "added by" line. Rows without metadata fall back to showing the URL, and rows without a thumbnail just omit the image.

  Videos added before this change will keep showing their raw URL; since dev data is disposable, that resolves itself as soon as you add fresh ones.

### Chromecast handling implementation

Done so far:

- Receiver page (receiver/index.html) — the page your Streamer will load when you cast: idle screen, YouTube IFrame player, listens for play/pause/resume/stop messages on urn:x-cast:com.videoparty.cast, and
  reports playback status back to the phone, including the embed-blocked case (YouTube error 101/150).
- Mobile library — react-native-google-cast 4.9.1 installed. The community Expo plugin couldn't install against SDK 56, but it turned out the library now ships its own config plugin, so I used that (configured in app.json with Google's default receiver CC1AD845 as a placeholder app ID until you register in the Cast console).
- Bonus fix — the JBR pin in gradle.properties that prebuild --clean kept erasing is now applied by a small local config plugin (mobile/plugins/withWindowsJavaHome.js), so it can never be lost again; I
  verified it survives a full --clean prebuild.
- Videos tab — organizer-only Cast button next to "Add Video" (native device picker included, no custom dialog needed), and while a cast session is connected each YouTube row shows a blue "▶ TV" action that
  sends the video to the receiver. Receiver-reported errors surface as a red line under the header. Typecheck and lint pass.
- Setup guide (receiver/README.md) — the one-time steps only you can do: the $5 Cast console registration, serving receiver/ on your LAN, registering the Streamer's serial, and swapping the real app ID into
  app.json.

### Casting is fully working. To recap what stood between yesterday's commit and a playing video — three unrelated problems, each masking the next

1. The receiver server was serving the wrong directory — serve receiver had been started outside the repo root, so everything got 404s. Restarted from the repo root.
2. The wrong serial number was registered — Android TV devices like the Streamer need their software (Cast) serial, not the hardware one; the console misleadingly still said "Ready for Testing." Your 0/O
   re-check fixed it, confirmed by probing the Streamer directly over the Cast protocol.
3. A CSS specificity bug in the receiver page — .hidden couldn't beat #idle's display: flex, so the idle screen sat on top of the playing video. Fixed as #idle.hidden.

Along the way we also established that your router delivers mDNS to the phone only intermittently — that's why cast pickers (even YouTube's) sometimes come up empty. Reopening the picker retries the scan; if
it annoys you long-term, look at the router's IGMP-snooping/multicast settings. All of this is saved in my notes for future sessions.

Committed as 76a1d70

### Cast receiver page moved to api server

The Cast receiver page is now served by the API server. receiver/ moved to VideoParty.Api/wwwroot/receiver/ and Program.cs gained static-file middleware, so the page is at http://<lan-ip>:5070/receiver/ and the separate npx serve process is gone — running the API is the whole casting setup now.

### The playlist now has a single TV control

The per-video "▶ TV" buttons are gone; a "▶ Play on TV" action on the Playlist heading plays the video at the top of the list, and flips to "■ Stop" while the TV is loading or playing (driven by the receiver's status broadcasts, so it resets on its own when a video ends or fails). It still appears only during a cast session, and only offers Play when the top video is a YouTube link.

### The playlist now advances itself as videos finish on the TV

When the receiver reports the top video ended, the organizer's phone deletes it through a new DELETE /VP/parties/{partyId}/videos/{id} endpoint (allowed for the organizer or the video's adder) and immediately casts the next YouTube video in the list. The API broadcasts VideoRemoved (same shape as VideoAdded), which every member's app bridges into its store — so played videos vanish live from everyone's playlist, and guests who join later never see them at all because the rows are gone from the database. The chain continues until the playlist is empty or the next entry isn't castable (non-YouTube link), at which point the TV returns to the idle screen. Interrupted playback (Stop, or a dropped session) doesn't count as played — the video stays at the top and restarts from the beginning next time.

Committed as 0856af5

### Manual video removal for organizers

### Keep transient SignalR drops out of the dev error overlay

When "Add Video" is clicked YouTube is opened causing the VP app to go to the background.
That causes the SignalR WebSocket to get disconnected.
That results (in dev mode) in an error being logged (by SignalR)
The disconnection is automatically fixed by SignalR, but the log is displayed.
The fix is to redirect the SignalR log to the console(?)

Committed as 9800654

## 2026-07-16

### Fixed the Connect TV regression from the Paper conversion

On Android showCastDialog() just clicks the most recently mounted native CastButton, so removing it made the button a silent no-op; a hidden 1×1 CastButton now stays mounted behind the Paper button.
Also moved Play on TV / Stop into the action row next to Add Video and Connect TV (row wraps on narrow screens).
