using Microsoft.AspNetCore.Mvc;
using VideoParty.DataAccess.Data;
using VideoParty.Model.Models;

namespace VideoParty.Api.Controllers
{
  [Route("[controller]")]
  [ApiController]
  public class VPController : ControllerBase
  {
    private readonly ApplicationDbContext _db;

    public VPController(ApplicationDbContext db)
    {
      _db = db;
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

      return CreatedAtAction(nameof(CreateParty), new { id = party.PartyId }, party);
    }
  }

  public record CreatePartyRequest(string Name);
}
