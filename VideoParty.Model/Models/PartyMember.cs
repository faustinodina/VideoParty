using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text;

namespace VideoParty.Model.Models
{
  // A participant of a party. Every participant has a row here, including
  // the organizer (whose UserId matches Party.OrganizerUserId).
  public class PartyMember : ITimestamped
  {
    [Key]
    public required Guid PartyMemberId { get; set; }

    public required Guid PartyId { get; set; }

    public Party Party { get; set; } = null!;

    // Device-generated user id of the client behind this member.
    public required Guid UserId { get; set; }

    public required string DisplayName { get; set; }

    // The single-use invitation code this member joined with. Null only for
    // the organizer's own row, which is created with the party itself. A
    // unique index (see ApplicationDbContext) enforces the single use.
    public string? InvitationId { get; set; }

    // Set by ApplicationDbContext on save; not `required` on purpose.
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
  }
}
