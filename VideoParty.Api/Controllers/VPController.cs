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

    [HttpPost("parties")]
    public async Task<ActionResult<Party>> CreateParty(CreatePartyRequest request)
    {
      var party = new Party
      {
        PartyId = Guid.NewGuid(),
        Name = request.Name
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

      var guest = new PartyGuest
      {
        PartyGuestId = Guid.NewGuid(),
        PartyId = partyId,
        GuestName = request.GuestName
      };

      _db.PartyGuests.Add(guest);
      await _db.SaveChangesAsync();

      await _hub.Clients.Group(partyId.ToString()).SendAsync("GuestRegistered", new
      {
        guest.PartyGuestId,
        guest.PartyId,
        guest.GuestName
      });

      return CreatedAtAction(nameof(GetGuest), new { partyId = partyId, id = guest.PartyGuestId }, guest);
    }
  }

  public record CreatePartyRequest(string Name);

  public record RegisterGuestRequest(string GuestName);
}
