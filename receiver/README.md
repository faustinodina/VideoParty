# VideoParty Cast Receiver

`index.html` is the Custom Web Receiver the Chromecast (Google TV Streamer)
loads when the organizer casts from the app. It plays YouTube videos with the
IFrame player, driven by messages from the phone over the
`urn:x-cast:com.videoparty.cast` channel (see `mobile/src/services/castService.ts`).

Nothing is installed on the TV device: the Streamer fetches this page fresh at
the start of every cast session from the URL registered in the Cast console.

## One-time setup (requires the Google account owner)

1. **Register as a Cast developer** at the
   [Google Cast SDK Developer Console](https://cast.google.com/publish)
   (one-time $5 fee).
2. **Serve this page on the LAN** (the Streamer fetches it, so it must be
   reachable from the Streamer, not just from this PC):

   ```
   npx serve receiver -l 8090
   ```

   The receiver URL is then `http://<your-pc-lan-ip>:8090/`. Plain HTTP is
   fine while the receiver is unpublished.
3. **Add a "Custom Receiver"** in the console with that URL. You get back an
   **Application ID** (e.g. `A1B2C3D4`).
4. **Register the Streamer for development**: console → "Cast Receiver
   Devices" → add the device's serial number (Google TV: Settings → System →
   About). Activation can take ~15 minutes and needs a device reboot.
5. **Put the Application ID in the app**: in `mobile/app.json`, replace the
   placeholder under the `react-native-google-cast` plugin:

   ```json
   ["react-native-google-cast", { "receiverAppId": "A1B2C3D4" }]
   ```

   `CC1AD845` (the placeholder) is Google's default media receiver — it lets
   the cast button discover devices and connect, but it cannot play YouTube;
   until the real ID is in place, "▶ TV" does nothing visible.
6. **Rebuild the dev client** (the ID is baked into the native manifest):

   ```
   cd mobile && npx expo prebuild --platform android && npm run android:phone
   ```

## Publishing (later, optional)

Only needed when devices not registered in the console should run the
receiver (i.e. other organizers). Host `index.html` on any public HTTPS host
(GitHub Pages works), update the URL in the console, and publish the receiver
there. No store listing or review is involved.

## Protocol

Sender → receiver: `{ type: "play", videoId }`, `{ type: "pause" }`,
`{ type: "resume" }`, `{ type: "stop" }`.

Receiver → senders (broadcast): `{ type: "status", state }` where state is
`idle | loading | playing | paused | ended | error`; on error it adds
`errorCode` (YouTube IFrame code) and `embedBlocked: true` when the video's
owner disallows embedded playback (codes 101/150).
