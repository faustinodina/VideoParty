using System;
using System.ComponentModel.DataAnnotations;

namespace VideoParty.Model.Models
{
  // One entry in a party's video playlist, added when a member shares a
  // video link into the party (see the share-sheet flow on the client).
  public class PartyVideo : ITimestamped
  {
    [Key]
    public required Guid PartyVideoId { get; set; }

    public required Guid PartyId { get; set; }

    public Party Party { get; set; } = null!;

    // Device-generated user id of the member who added the video.
    public required Guid AddedByUserId { get; set; }

    // The video link as shared (currently YouTube URLs from the Android
    // share sheet).
    public required string Url { get; set; }

    // Display metadata fetched from the provider's oEmbed endpoint when the
    // video was added; null when the fetch failed (clients fall back to Url).
    public string? Title { get; set; }
    public string? ThumbnailUrl { get; set; }

    // Order of the video within the party's playlist; lower plays first.
    // Gaps are fine, only the relative order matters.
    public required int Position { get; set; }

    // Set by ApplicationDbContext on save; not `required` on purpose.
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
  }
}
