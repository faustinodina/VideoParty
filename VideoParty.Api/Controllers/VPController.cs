using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using VideoParty.Api.Hubs;
using VideoParty.DataAccess.Data;
using VideoParty.Model.Models;

namespace VideoParty.Api.Controllers
{
  [Route("[controller]")]
  [ApiController]
  public class VPController : ControllerBase
  {
    private readonly ApplicationDbContext _db;
    private readonly IHubContext<UserHub> _hub;

    public VPController(ApplicationDbContext db, IHubContext<UserHub> hub)
    {
      _db = db;
      _hub = hub;
    }

    [HttpGet("parties/{id:guid}", Name = nameof(GetParty))]
    public async Task<ActionResult<Party>> GetParty(Guid id)
    {
      var party = await _db.Parties.FindAsync(id);
      if (party is null)
      {
        return NotFound($"Party '{id}' was not found.");
      }

      return party;
    }

    [HttpGet("parties/{partyId:guid}/guests")]
    public async Task<ActionResult<IEnumerable<PartyGuest>>> GetGuests(Guid partyId)
    {
      var partyExists = await _db.Parties.AnyAsync(p => p.PartyId == partyId);
      if (!partyExists)
      {
        return NotFound($"Party '{partyId}' was not found.");
      }

      return await _db.PartyGuests
          .Where(g => g.PartyId == partyId)
          .ToListAsync();
    }

    [HttpGet("parties/{partyId:guid}/guests/{id:guid}", Name = nameof(GetGuest))]
    public async Task<ActionResult<PartyGuest>> GetGuest(Guid partyId, Guid id)
    {
      var guest = await _db.PartyGuests
          .FirstOrDefaultAsync(g => g.PartyId == partyId && g.PartyGuestId == id);
      if (guest is null)
      {
        return NotFound($"Guest '{id}' was not found in party '{partyId}'.");
      }

      return guest;
    }

    // All parties where the user is the organizer or a registered guest.
    [HttpGet("users/{userId:guid}/parties")]
    public async Task<ActionResult<IEnumerable<PartySummary>>> GetUserParties(Guid userId)
    {
      // Two queries combined in memory: EF cannot translate Concat over
      // projections to the PartySummary record.
      var organized = await _db.Parties
          .Where(p => p.OrganizerUserId == userId)
          .Select(p => new PartySummary(p.PartyId, p.Name, PartyRole.Organizer))
          .ToListAsync();

      var joined = await _db.PartyGuests
          .Where(g => g.UserId == userId && g.Party.OrganizerUserId != userId)
          .Select(g => new PartySummary(g.PartyId, g.Party.Name, PartyRole.Guest))
          .ToListAsync();

      return organized.Concat(joined).ToList();
    }

    [HttpPost("parties")]
    public async Task<ActionResult<Party>> CreateParty(CreatePartyRequest request)
    {
      var party = new Party
      {
        PartyId = Guid.NewGuid(),
        Name = request.Name,
        OrganizerUserId = request.OrganizerUserId
      };

      _db.Parties.Add(party);
      await _db.SaveChangesAsync();

      return CreatedAtAction(nameof(GetParty), new { id = party.PartyId }, party);
    }

    [HttpPost("parties/{partyId:guid}/guests")]
    public async Task<ActionResult<PartyGuest>> RegisterGuest(Guid partyId, RegisterGuestRequest request)
    {
      var partyExists = await _db.Parties.AnyAsync(p => p.PartyId == partyId);
      if (!partyExists)
      {
        return NotFound($"Party '{partyId}' was not found.");
      }

      // Joining twice from the same device is a no-op: return the existing guest.
      var existing = await _db.PartyGuests
          .FirstOrDefaultAsync(g => g.PartyId == partyId && g.UserId == request.UserId);
      if (existing is not null)
      {
        return existing;
      }

      var guest = new PartyGuest
      {
        PartyGuestId = Guid.NewGuid(),
        PartyId = partyId,
        UserId = request.UserId,
        GuestName = request.GuestName
      };

      _db.PartyGuests.Add(guest);
      await _db.SaveChangesAsync();

      await _hub.Clients.Group(partyId.ToString()).SendAsync("GuestRegistered", new
      {
        guest.PartyGuestId,
        guest.PartyId,
        guest.UserId,
        guest.GuestName
      });

      return CreatedAtAction(nameof(GetGuest), new { partyId = partyId, id = guest.PartyGuestId }, guest);
    }
  }

  public record CreatePartyRequest(string Name, Guid OrganizerUserId);

  public record RegisterGuestRequest(string GuestName, Guid UserId);

  public enum PartyRole
  {
    Organizer,
    Guest
  }

  public record PartySummary(Guid PartyId, string Name, PartyRole Role);
}
