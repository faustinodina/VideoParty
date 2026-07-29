using System;
using System.ComponentModel.DataAnnotations;

namespace VideoParty.Model.Models
{
  // A member's up-vote on a video in the party's playlist. One row per
  // (video, user) pair; a unique index enforces the one-vote-per-member limit.
  public class PartyVideoVote : ITimestamped
  {
    [Key]
    public required Guid PartyVideoVoteId { get; set; }

    public required Guid PartyVideoId { get; set; }

    public PartyVideo Video { get; set; } = null!;

    public required Guid UserId { get; set; }

    // Set by ApplicationDbContext on save; not `required` on purpose.
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
  }
}
