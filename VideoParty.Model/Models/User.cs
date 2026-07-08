using System;
using System.ComponentModel.DataAnnotations;

namespace VideoParty.Model.Models
{
  // A device-registered identity. The device holds the plaintext secret and
  // exchanges it for a JWT; only the hash is stored here.
  public class User : ITimestamped
  {
    [Key]
    public required Guid UserId { get; set; }

    // Human-friendly name, asked on the device when the identity is created.
    public required string Name { get; set; }

    // SHA-256 of the device secret, uppercase hex.
    public required string SecretHash { get; set; }

    // Set by ApplicationDbContext on save; not `required` on purpose.
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
  }
}
