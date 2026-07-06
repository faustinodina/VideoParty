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

    // All parties where the user is the organizer or a member, newest first.
    [HttpGet("users/{userId:guid}/parties")]
    public async Task<ActionResult<IEnumerable<PartySummary>>> GetUserParties(Guid userId)
    {
      // Two queries combined in memory: EF cannot translate Concat over
      // projections to the PartySummary record.
      var organized = await _db.Parties
          .Where(p => p.OrganizerUserId == userId)
          .Select(p => new PartySummary(
              p.PartyId, p.Name, PartyRole.Organizer, p.CreatedAt, p.OrganizerUserId))
          .ToListAsync();

      // Organized parties are excluded: the organizer also has a member row,
      // which would otherwise duplicate the party in the list.
      var joined = await _db.PartyMembers
          .Where(m => m.UserId == userId && m.Party.OrganizerUserId != userId)
          .Select(m => new PartySummary(
              m.PartyId, m.Party.Name, PartyRole.Guest, m.Party.CreatedAt, m.Party.OrganizerUserId))
          .ToListAsync();

      return organized.Concat(joined)
          .OrderByDescending(p => p.CreatedAt)
          .ToList();
    }

    [HttpGet("parties/{partyId:guid}/members")]
    public async Task<ActionResult<IEnumerable<PartyMember>>> GetMembers(Guid partyId)
    {
      var partyExists = await _db.Parties.AnyAsync(p => p.PartyId == partyId);
      if (!partyExists)
      {
        return NotFound($"Party '{partyId}' was not found.");
      }

      return await _db.PartyMembers
          .Where(m => m.PartyId == partyId)
          .ToListAsync();
    }

    [HttpGet("parties/{partyId:guid}/members/{id:guid}", Name = nameof(GetMember))]
    public async Task<ActionResult<PartyMember>> GetMember(Guid partyId, Guid id)
    {
      var member = await _db.PartyMembers
          .FirstOrDefaultAsync(m => m.PartyId == partyId && m.PartyMemberId == id);
      if (member is null)
      {
        return NotFound($"Member '{id}' was not found in party '{partyId}'.");
      }

      return member;
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

      // The organizer is a participant of their own party; registering them
      // here keeps the members list the single source of truth (and is the
      // only place their display name is captured). Same SaveChanges so the
      // party is never persisted without its organizer.
      var organizerMember = new PartyMember
      {
        PartyMemberId = Guid.NewGuid(),
        PartyId = party.PartyId,
        UserId = request.OrganizerUserId,
        DisplayName = request.OrganizerName
      };

      _db.Parties.Add(party);
      _db.PartyMembers.Add(organizerMember);
      await _db.SaveChangesAsync();

      return CreatedAtAction(nameof(GetParty), new { id = party.PartyId }, party);
    }

    [HttpPost("parties/{partyId:guid}/members")]
    public async Task<ActionResult<PartyMember>> RegisterMember(Guid partyId, RegisterMemberRequest request)
    {
      var partyExists = await _db.Parties.AnyAsync(p => p.PartyId == partyId);
      if (!partyExists)
      {
        return NotFound($"Party '{partyId}' was not found.");
      }

      // Joining twice from the same device is a no-op: return the existing member.
      var existing = await _db.PartyMembers
          .FirstOrDefaultAsync(m => m.PartyId == partyId && m.UserId == request.UserId);
      if (existing is not null)
      {
        return existing;
      }

      var member = new PartyMember
      {
        PartyMemberId = Guid.NewGuid(),
        PartyId = partyId,
        UserId = request.UserId,
        DisplayName = request.DisplayName
      };

      _db.PartyMembers.Add(member);
      await _db.SaveChangesAsync();

      // Same shape as GetMembers items so clients can mix fetched and live data.
      await _hub.Clients.Group(partyId.ToString()).SendAsync("MemberJoined", new
      {
        member.PartyMemberId,
        member.PartyId,
        member.UserId,
        member.DisplayName,
        member.CreatedAt,
        member.UpdatedAt
      });

      return CreatedAtAction(nameof(GetMember), new { partyId = partyId, id = member.PartyMemberId }, member);
    }
  }

  public record CreatePartyRequest(string Name, Guid OrganizerUserId, string OrganizerName);

  public record RegisterMemberRequest(string DisplayName, Guid UserId);

  public enum PartyRole
  {
    Organizer,
    Guest
  }

  public record PartySummary(
      Guid PartyId, string Name, PartyRole Role, DateTime CreatedAt, Guid OrganizerUserId);
}
