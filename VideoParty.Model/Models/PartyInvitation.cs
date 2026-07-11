using System;
using System.ComponentModel.DataAnnotations;

namespace VideoParty.Model.Models
{
  // A single-use pass to join one specific party, minted when the organizer
  // shares the party. Issuance lives here; usage is recorded by the joining
  // member's PartyMember.InvitationId (unique, so one use at most).
  public class PartyInvitation : ITimestamped
  {
    [Key]
    public required Guid InvitationId { get; set; }

    public required Guid PartyId { get; set; }

    public Party Party { get; set; } = null!;

    // Set by ApplicationDbContext on save; not `required` on purpose.
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
  }
}
