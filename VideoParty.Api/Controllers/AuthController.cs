using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using VideoParty.DataAccess.Data;
using VideoParty.Model.Models;

namespace VideoParty.Api.Controllers
{
  // Device-token authentication: a device registers once and receives a
  // { userId, secret } pair it persists locally, then exchanges the secret
  // for a short-lived JWT that authenticates API and SignalR calls. No
  // passwords — possession of the secret is the identity.
  [Route("[controller]")]
  [ApiController]
  public class AuthController : ControllerBase
  {
    private static readonly TimeSpan TokenLifetime = TimeSpan.FromHours(8);

    private readonly ApplicationDbContext _db;
    private readonly IConfiguration _config;

    public AuthController(ApplicationDbContext db, IConfiguration config)
    {
      _db = db;
      _config = config;
    }

    // Creates a new user identity. The plaintext secret is returned exactly
    // once, here; only its hash is stored.
    [HttpPost("register")]
    public async Task<ActionResult<RegisterResponse>> Register()
    {
      var secret = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));

      var user = new User
      {
        UserId = Guid.NewGuid(),
        SecretHash = HashSecret(secret)
      };

      _db.Users.Add(user);
      await _db.SaveChangesAsync();

      return new RegisterResponse(user.UserId, secret);
    }

    [HttpPost("token")]
    public async Task<ActionResult<TokenResponse>> Token(TokenRequest request)
    {
      var user = await _db.Users.FindAsync(request.UserId);
      if (user is null || !SecretMatches(request.Secret, user.SecretHash))
      {
        return Unauthorized("Unknown user id or wrong secret.");
      }

      var expiresAt = DateTime.UtcNow.Add(TokenLifetime);
      var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));

      var descriptor = new SecurityTokenDescriptor
      {
        // `sub` maps to ClaimTypes.NameIdentifier, which VPController and
        // SignalR's Context.UserIdentifier read the caller's id from.
        Claims = new Dictionary<string, object>
        {
          [JwtRegisteredClaimNames.Sub] = user.UserId.ToString()
        },
        Expires = expiresAt,
        Issuer = _config["Jwt:Issuer"],
        Audience = _config["Jwt:Audience"],
        SigningCredentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256)
      };

      var token = new JsonWebTokenHandler().CreateToken(descriptor);

      return new TokenResponse(token, expiresAt);
    }

    private static string HashSecret(string secret) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(secret)));

    private static bool SecretMatches(string secret, string storedHash) =>
        CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(HashSecret(secret)),
            Encoding.UTF8.GetBytes(storedHash));
  }

  public record RegisterResponse(Guid UserId, string Secret);

  public record TokenRequest(Guid UserId, string Secret);

  public record TokenResponse(string AccessToken, DateTime ExpiresAt);
}
