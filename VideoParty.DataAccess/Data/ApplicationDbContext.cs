using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using VideoParty.Model.Models;

namespace VideoParty.DataAccess.Data
{
  public class ApplicationDbContext : DbContext
  {
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<Party> Parties { get; set; }
    public DbSet<PartyGuest> PartyGuests { get; set; }

    public override int SaveChanges(bool acceptAllChangesOnSuccess)
    {
      StampTimestamps();
      return base.SaveChanges(acceptAllChangesOnSuccess);
    }

    public override Task<int> SaveChangesAsync(
        bool acceptAllChangesOnSuccess,
        CancellationToken cancellationToken = default)
    {
      StampTimestamps();
      return base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
    }

    // One UtcNow per save so all entities in a batch get identical stamps.
    private void StampTimestamps()
    {
      var now = DateTime.UtcNow;

      foreach (var entry in ChangeTracker.Entries<ITimestamped>())
      {
        if (entry.State == EntityState.Added)
        {
          entry.Entity.CreatedAt = now;
          entry.Entity.UpdatedAt = now;
        }
        else if (entry.State == EntityState.Modified)
        {
          entry.Entity.UpdatedAt = now;
        }
      }
    }
  }
}
