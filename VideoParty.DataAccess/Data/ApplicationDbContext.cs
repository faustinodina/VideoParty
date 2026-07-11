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
    public DbSet<PartyInvitation> PartyInvitations { get; set; }
    public DbSet<User> Users { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
      base.OnModelCreating(modelBuilder);

      // An invitation can be used by at most one member. NULLs (organizer
      // rows) are distinct from each other, so multiple are allowed.
      modelBuilder.Entity<PartyMember>()
          .HasIndex(m => m.InvitationId)
          .IsUnique();

      // SQLite stores DateTime as TEXT with no kind, so values read back are
      // Kind=Unspecified and would serialize without the Z suffix. All stored
      // timestamps are UTC by convention; mark them as such when reading.
      var utcConverter = new ValueConverter<DateTime, DateTime>(
          v => v,
          v => DateTime.SpecifyKind(v, DateTimeKind.Utc));
      var utcNullableConverter = new ValueConverter<DateTime?, DateTime?>(
          v => v,
          v => v == null ? v : DateTime.SpecifyKind(v.Value, DateTimeKind.Utc));

      foreach (var entityType in modelBuilder.Model.GetEntityTypes())
      {
        foreach (var property in entityType.GetProperties())
        {
          if (property.ClrType == typeof(DateTime))
          {
            property.SetValueConverter(utcConverter);
          }
          else if (property.ClrType == typeof(DateTime?))
          {
            property.SetValueConverter(utcNullableConverter);
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
