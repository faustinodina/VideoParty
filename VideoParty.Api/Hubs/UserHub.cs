using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace VideoParty.Api.Hubs
{
  // Requires the same JWT as the REST API; the SignalR client passes it via
  // accessTokenFactory (query string on WebSocket requests).
  [Authorize]
  public class UserHub : Hub
  {
    public static int TotalViews { get; set; } = 0;

    public async Task NewWindowLoaded()
    {
      // do some logic
      TotalViews++;

      // send update to all connected clients
      // UpdateTotalViews is the name of the method that will be called on the client side
      await Clients.All.SendAsync("UpdateTotalViews", TotalViews);
    }

    // Clients call this after connecting so they only receive events for their party.
    public Task JoinParty(Guid partyId) =>
        Groups.AddToGroupAsync(Context.ConnectionId, partyId.ToString());

    // Clients call this when they no longer belong to a party (e.g. removed
    // by the organizer) so they stop receiving its events.
    public Task LeaveParty(Guid partyId) =>
        Groups.RemoveFromGroupAsync(Context.ConnectionId, partyId.ToString());

    // The organizer's phone is the only cast sender, so TV playback
    // failures (e.g. an embed-blocked video) are known only to it. This
    // relays the failure to the rest of the party; the reporter is
    // excluded because it already shows the error locally.
    public Task ReportPlaybackIssue(Guid partyId, string message) =>
        Clients.OthersInGroup(partyId.ToString())
            .SendAsync("PlaybackIssue", new { partyId, message });
  }
}
