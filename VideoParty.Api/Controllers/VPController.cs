using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using VideoParty.Api.Hubs;
using VideoParty.DataAccess.Data;
using VideoParty.Model.Models;

namespace VideoParty.Api.Controllers
{
  [Authorize]
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

    // The authenticated caller, from the JWT's `sub` claim (see AuthController).
    private Guid CallerUserId =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

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

    // All parties where the caller is the organizer or a member, newest first.
    [HttpGet("me/parties")]
    public async Task<ActionResult<IEnumerable<PartySummary>>> GetUserParties()
    {
      var userId = CallerUserId;
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
        OrganizerUserId = CallerUserId
      };

      // The organizer is a participant of their own party; registering them
      // here keeps the members list the single source of truth (and is the
      // only place their display name is captured). Same SaveChanges so the
      // party is never persisted without its organizer.
      var organizerMember = new PartyMember
      {
        PartyMemberId = Guid.NewGuid(),
        PartyId = party.PartyId,
        UserId = party.OrganizerUserId,
        DisplayName = request.OrganizerName
      };

      _db.Parties.Add(party);
      _db.PartyMembers.Add(organizerMember);
      await _db.SaveChangesAsync();

      return CreatedAtAction(nameof(GetParty), new { id = party.PartyId }, party);
    }

    // Issues a fresh single-use invitation for the party. Persisting it here
    // is what lets RegisterMember insist the id was really minted for the
    // party being joined; the id is consumed by the PartyMember row created
    // when someone joins with it.
    [HttpPost("parties/{partyId:guid}/invitations")]
    public async Task<ActionResult<PartyInvitation>> CreateInvitation(Guid partyId)
    {
      var party = await _db.Parties.FindAsync(partyId);
      if (party is null)
      {
        return NotFound($"Party '{partyId}' was not found.");
      }

      if (party.OrganizerUserId != CallerUserId)
      {
        return StatusCode(StatusCodes.Status403Forbidden,
            "Only the organizer can invite people to this party.");
      }

      var invitation = new PartyInvitation
      {
        InvitationId = Guid.NewGuid(),
        PartyId = partyId
      };

      _db.PartyInvitations.Add(invitation);
      await _db.SaveChangesAsync();

      return invitation;
    }

    [HttpPost("parties/{partyId:guid}/members")]
    public async Task<ActionResult<PartyMember>> RegisterMember(Guid partyId, RegisterMemberRequest request)
    {
      var partyExists = await _db.Parties.AnyAsync(p => p.PartyId == partyId);
      if (!partyExists)
      {
        return NotFound($"Party '{partyId}' was not found.");
      }

      var userId = CallerUserId;

      // Joining twice from the same device is a no-op: return the existing
      // member without consuming the invitation.
      var existing = await _db.PartyMembers
          .FirstOrDefaultAsync(m => m.PartyId == partyId && m.UserId == userId);
      if (existing is not null)
      {
        return existing;
      }

      if (request.InvitationId is not Guid invitationId)
      {
        return BadRequest("An invitation is required to join this party.");
      }

      // Only invitations the organizer actually minted for THIS party are
      // accepted; a guessed id or one shared for another party fails here.
      var invitationExists = await _db.PartyInvitations
          .AnyAsync(i => i.InvitationId == invitationId && i.PartyId == partyId);
      if (!invitationExists)
      {
        return BadRequest("This invitation is not valid for this party.");
      }

      // Each invitation admits one member; the unique index on InvitationId
      // backs this check against concurrent joins.
      var invitationUsed = await _db.PartyMembers
          .AnyAsync(m => m.InvitationId == invitationId);
      if (invitationUsed)
      {
        return Conflict("This invitation has already been used. Ask the organizer for a new one.");
      }

      var member = new PartyMember
      {
        PartyMemberId = Guid.NewGuid(),
        PartyId = partyId,
        UserId = userId,
        DisplayName = request.DisplayName,
        InvitationId = invitationId
      };

      _db.PartyMembers.Add(member);
      try
      {
        await _db.SaveChangesAsync();
      }
      catch (DbUpdateException)
      {
        // Two joins raced on the same invitation; the unique index let only
        // the first one through.
        return Conflict("This invitation has already been used. Ask the organizer for a new one.");
      }

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

    // Only the party's organizer may remove members.
    [HttpDelete("parties/{partyId:guid}/members/{id:guid}")]
    public async Task<IActionResult> RemoveMember(Guid partyId, Guid id)
    {
      var party = await _db.Parties.FindAsync(partyId);
      if (party is null)
      {
        return NotFound($"Party '{partyId}' was not found.");
      }

      if (party.OrganizerUserId != CallerUserId)
      {
        return StatusCode(StatusCodes.Status403Forbidden,
            "Only the organizer can remove members from this party.");
      }

      var member = await _db.PartyMembers
          .FirstOrDefaultAsync(m => m.PartyId == partyId && m.PartyMemberId == id);
      if (member is null)
      {
        return NotFound($"Member '{id}' was not found in party '{partyId}'.");
      }

      // The organizer's member row is what keeps them in their own party's
      // members list; removing it would leave the party without a participant.
      if (member.UserId == party.OrganizerUserId)
      {
        return BadRequest("The organizer cannot be removed from their own party.");
      }

      _db.PartyMembers.Remove(member);
      await _db.SaveChangesAsync();

      // Same shape as MemberJoined so clients reuse the PartyMember type.
      await _hub.Clients.Group(partyId.ToString()).SendAsync("MemberRemoved", new
      {
        member.PartyMemberId,
        member.PartyId,
        member.UserId,
        member.DisplayName,
        member.CreatedAt,
        member.UpdatedAt
      });

      return NoContent();
    }
  }

  public record CreatePartyRequest(string Name, string OrganizerName);

  public record RegisterMemberRequest(string DisplayName, Guid? InvitationId);

  public enum PartyRole
  {
    Organizer,
    Guest
  }

  public record PartySummary(
      Guid PartyId, string Name, PartyRole Role, DateTime CreatedAt, Guid OrganizerUserId);
}
