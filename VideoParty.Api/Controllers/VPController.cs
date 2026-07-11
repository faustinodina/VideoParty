using System.Security.Claims;
using System.Security.Cryptography;
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

    // Short enough to type, ~2^39 combinations; the alphabet drops the
    // characters people misread (0/O, 1/I/L) and U (Crockford's obscenity
    // guard). Codes are single-use and party-bound, so this is ample.
    private const int InvitationCodeLength = 8;
    private const string InvitationCodeAlphabet = "ABCDEFGHJKMNPQRSTVWXYZ23456789";

    private static string NewInvitationCode()
    {
      Span<char> chars = stackalloc char[InvitationCodeLength];
      for (var i = 0; i < chars.Length; i++)
      {
        chars[i] = InvitationCodeAlphabet[
            RandomNumberGenerator.GetInt32(InvitationCodeAlphabet.Length)];
      }
      return new string(chars);
    }

    // Codes are stored uppercase; accept however the guest typed it.
    private static string NormalizeInvitationCode(string code) =>
        code.Trim().ToUpperInvariant();

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

      // Retry on the (rare) chance the generated code already exists; the
      // primary key turns a concurrent duplicate into a DbUpdateException.
      for (var attempt = 0; ; attempt++)
      {
        var invitation = new PartyInvitation
        {
          InvitationId = NewInvitationCode(),
          PartyId = partyId
        };

        _db.PartyInvitations.Add(invitation);
        try
        {
          await _db.SaveChangesAsync();
          return invitation;
        }
        catch (DbUpdateException) when (attempt < 4)
        {
          _db.Entry(invitation).State = EntityState.Detached;
        }
      }
    }

    // Joining is by invitation code alone: the code was minted for exactly
    // one party (see CreateInvitation), so the party is derived from it.
    [HttpPost("invitations/{code}/members")]
    public async Task<ActionResult<PartyMember>> RegisterMember(string code, RegisterMemberRequest request)
    {
      code = NormalizeInvitationCode(code);

      var invitation = await _db.PartyInvitations.FindAsync(code);
      if (invitation is null)
      {
        return NotFound("This invitation is not valid. Ask the organizer for a new one.");
      }

      var partyId = invitation.PartyId;
      var userId = CallerUserId;

      // Joining twice from the same device is a no-op: return the existing
      // member without consuming the invitation.
      var existing = await _db.PartyMembers
          .FirstOrDefaultAsync(m => m.PartyId == partyId && m.UserId == userId);
      if (existing is not null)
      {
        return existing;
      }

      // Consumption lives on the invitation, not the member row, so removing
      // the member later does not make the code valid again.
      if (invitation.UsedAt is not null)
      {
        return Conflict("This invitation has already been used. Ask the organizer for a new one.");
      }

      var member = new PartyMember
      {
        PartyMemberId = Guid.NewGuid(),
        PartyId = partyId,
        UserId = userId,
        DisplayName = request.DisplayName,
        InvitationId = code
      };

      // One SaveChanges: the member is admitted and the invitation consumed
      // in the same transaction.
      invitation.UsedAt = DateTime.UtcNow;
      _db.PartyMembers.Add(member);
      try
      {
        await _db.SaveChangesAsync();
      }
      catch (DbUpdateException)
      {
        // Two joins raced on the same invitation; the unique index on
        // PartyMember.InvitationId let only the first one through.
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

    // A guest abandons the party on their own. Mirrors RemoveMember's
    // broadcast so every client, including the leaver's, reacts the same way
    // as to an organizer removal.
    [HttpDelete("parties/{partyId:guid}/members/me")]
    public async Task<IActionResult> LeaveParty(Guid partyId)
    {
      var party = await _db.Parties.FindAsync(partyId);
      if (party is null)
      {
        return NotFound($"Party '{partyId}' was not found.");
      }

      var userId = CallerUserId;

      // The organizer's member row anchors the party (see RemoveMember).
      if (party.OrganizerUserId == userId)
      {
        return BadRequest("The organizer cannot abandon their own party.");
      }

      var member = await _db.PartyMembers
          .FirstOrDefaultAsync(m => m.PartyId == partyId && m.UserId == userId);
      if (member is null)
      {
        return NotFound($"You are not a member of party '{partyId}'.");
      }

      _db.PartyMembers.Remove(member);
      await _db.SaveChangesAsync();

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

  public record RegisterMemberRequest(string DisplayName);

  public enum PartyRole
  {
    Organizer,
    Guest
  }

  public record PartySummary(
      Guid PartyId, string Name, PartyRole Role, DateTime CreatedAt, Guid OrganizerUserId);
}
