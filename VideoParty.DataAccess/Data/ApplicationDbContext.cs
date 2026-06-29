using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Text;
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
  }
}
