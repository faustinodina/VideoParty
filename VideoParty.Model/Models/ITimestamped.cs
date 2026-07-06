using System;

namespace VideoParty.Model.Models
{
  // Entities with audit timestamps, stamped automatically by
  // ApplicationDbContext on save. All values are UTC.
  public interface ITimestamped
  {
    DateTime CreatedAt { get; set; }
    DateTime UpdatedAt { get; set; }
  }
}
