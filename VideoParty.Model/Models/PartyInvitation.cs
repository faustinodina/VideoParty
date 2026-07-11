using System;
using System.ComponentModel.DataAnnotations;

namespace VideoParty.Model.Models
{
  // A single-use pass to join one specific party, minted when the organizer
  // shares the party. Consumption is stamped here (UsedAt) so it survives
  // the member's removal; the unique PartyMember.InvitationId index guards
  // the same rule against concurrent joins.
  public class PartyInvitation : ITimestamped
  {
    // A short human-typeable code (see VPController.NewInvitationCode),
    // always stored uppercase.
    [Key]
    public required string InvitationId { get; set; }

    public required Guid PartyId { get; set; }

    public Party Party { get; set; } = null!;

    // UTC time the invitation admitted its member; null while unused. Never
    // cleared: a consumed invitation stays consumed even if the member who
    // used it is later removed from the party.
    public DateTime? UsedAt { get; set; }

    // Set by ApplicationDbContext on save; not `required` on purpose.
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
  }
}
