using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
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
    public DbSet<PartyMember> PartyMembers { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
      base.OnModelCreating(modelBuilder);

      // SQLite stores DateTime as TEXT with no kind, so values read back are
      // Kind=Unspecified and would serialize without the Z suffix. All stored
      // timestamps are UTC by convention; mark them as such when reading.
      var utcConverter = new ValueConverter<DateTime, DateTime>(
          v => v,
          v => DateTime.SpecifyKind(v, DateTimeKind.Utc));

      foreach (var entityType in modelBuilder.Model.GetEntityTypes())
      {
        foreach (var property in entityType.GetProperties())
        {
          if (property.ClrType == typeof(DateTime))
          {
            property.SetValueConverter(utcConverter);
          }
        }
      }
    }

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
