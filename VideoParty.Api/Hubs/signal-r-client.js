// javascript SignarR client
// create connecti
var connectionUserCount = new signalR.HubConnectionBuilder().withUrl("/hubs/userCount").build();

// connect to methods that hub invokes (receive notifications)
connectionUserCount.on("updateTotalViews", (value) => {
    // handle the updated total views value
    var newCountSpan = document.getElementById("totalViewsCounter");
    newCountSpan.innerText = value.toString();
});

// invoke hub methods (send notifications)
function newWindowLoadedOnClient() {
    connectionUserCount.send("NewWindowLoaded");
}

// start connection
function fulfilled() {

}

function rejected() {
}

connectionUserCount.start().then(fulfilled, rejected);