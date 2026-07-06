using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text;

namespace VideoParty.Model.Models
{
  public class PartyGuest : ITimestamped
  {
    [Key]
    public required Guid PartyGuestId { get; set; }

    public required Guid PartyId { get; set; }

    public Party Party { get; set; } = null!;

    // Device-generated user id of the client that joined as this guest.
    public required Guid UserId { get; set; }

    public required string GuestName { get; set; }

    // Set by ApplicationDbContext on save; not `required` on purpose.
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
  }
}
