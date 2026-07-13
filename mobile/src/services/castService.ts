/**
 * Casting to the party's TV. The organizer's phone is a Cast sender: it
 * launches the VideoParty receiver page (receiver/index.html, registered in
 * the Google Cast Developer Console) on the Chromecast and drives it with
 * messages over this custom channel. The receiver plays videos through the
 * YouTube IFrame player, so only the video id travels over the channel.
 */

/** Must match NAMESPACE in receiver/index.html. */
export const CAST_NAMESPACE = "urn:x-cast:com.videoparty.cast";

/** Sender → receiver. */
export type CastCommand =
  | { type: "play"; videoId: string }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "stop" };

/** Receiver → sender, broadcast on every playback state change. */
export interface CastStatus {
  type: "status";
  state: "idle" | "loading" | "playing" | "paused" | "ended" | "error";
  /** YouTube IFrame player error code, present when state is "error". */
  errorCode?: number;
  /** True when the video's owner disallows embedded playback (101/150). */
  embedBlocked?: boolean;
}

// Covers the link shapes YouTube shares produce: youtu.be short links,
// watch?v=, shorts/, live/, embed/. Video ids are 11 chars of [\w-].
const VIDEO_ID_PATTERNS = [
  /youtu\.be\/([\w-]{11})/,
  /youtube\.com\/watch\?[^#]*\bv=([\w-]{11})/,
  /youtube\.com\/(?:shorts|live|embed)\/([\w-]{11})/,
];

/** The YouTube video id in `url`, or null when it isn't a YouTube link. */
export function extractYouTubeVideoId(url: string): string | null {
  for (const pattern of VIDEO_ID_PATTERNS) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return null;
}
