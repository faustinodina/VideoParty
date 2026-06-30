using Microsoft.AspNetCore.SignalR;

namespace VideoParty.Api.Hubs
{
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
  }
}
