using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using VideoParty.Api.Hubs;
using VideoParty.DataAccess.Data;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddControllers()
    .AddJsonOptions(options =>
        // Serialize enums (e.g. PartyRole) as camelCase strings instead of numbers.
        options.JsonSerializerOptions.Converters.Add(
            new JsonStringEnumConverter(JsonNamingPolicy.CamelCase)));
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

builder.Services.AddSignalR();

// Used by VPController to fetch video titles/thumbnails from oEmbed
// endpoints. The short timeout keeps a slow provider from stalling AddVideo;
// on expiry the video is simply saved without metadata.
builder.Services.AddHttpClient("oembed", client =>
    client.Timeout = TimeSpan.FromSeconds(5));

// Bearer JWTs issued by AuthController (see its comment for the device-token
// scheme). The same token authenticates REST calls and the SignalR hub.
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
      options.TokenValidationParameters = new TokenValidationParameters
      {
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!))
      };

      // Browsers cannot set headers on WebSocket requests, so the SignalR
      // client sends the token as a query parameter on hub requests.
      options.Events = new JwtBearerEvents
      {
        OnMessageReceived = context =>
        {
          var accessToken = context.Request.Query["access_token"];
          if (!string.IsNullOrEmpty(accessToken) &&
              context.HttpContext.Request.Path.StartsWithSegments("/hubs"))
          {
            context.Token = accessToken;
          }
          return Task.CompletedTask;
        },
        // A JWT stays valid after its user is deleted (e.g. a dev database
        // wipe), so a signature check alone lets ghost users through.
        OnTokenValidated = async context =>
        {
          var userId = context.Principal?.FindFirstValue(ClaimTypes.NameIdentifier);
          var db = context.HttpContext.RequestServices
              .GetRequiredService<ApplicationDbContext>();
          if (!Guid.TryParse(userId, out var id) ||
              !await db.Users.AnyAsync(u => u.UserId == id))
          {
            context.Fail("Token references a user that no longer exists.");
          }
        }
      };
    });

builder.Services.AddAuthorization();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
  app.MapOpenApi();
  app.UseSwaggerUI(options =>
      options.SwaggerEndpoint("/openapi/v1.json", "VideoParty API"));
}

app.UseHttpsRedirection();

// Serves the Cast receiver page from wwwroot: the Streamer fetches
// /receiver/ at the start of every cast session (URL registered in the Cast
// console). UseDefaultFiles rewrites the directory URL to index.html.
app.UseDefaultFiles();
app.UseStaticFiles();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.MapHub<UserHub>("/hubs/user");

app.Run();
