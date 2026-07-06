using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text;

namespace VideoParty.Model.Models
{
  public class Party : ITimestamped
  {
    [Key]
    public required Guid PartyId { get; set; }
    public required string Name { get; set; }

    // Device-generated user id of the client that created the party.
    public required Guid OrganizerUserId { get; set; }

    // Set by ApplicationDbContext on save; not `required` on purpose.
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
  }
}
