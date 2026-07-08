import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router";
import { useEffect } from "react";
import { Alert, Platform, useColorScheme } from "react-native";
import { Provider } from "react-redux";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import AppTabs from "@/components/app-tabs";
import signalR from "@/services/signalRService";
import { getUserId, onIdentityReset } from "@/services/userIdentity";
import { store } from "@/store";
import {
  fetchParties,
  memberJoined,
  memberRemoved,
  removedFromParty,
} from "@/store/partySlice";

export default function TabLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    signalR.on("VideoStarted", (videoId) => {
      console.log("Playing video:", videoId);
    });

    // Bridge SignalR events into the store so any screen can select them.
    const unsubscribeJoined = signalR.onMemberJoined((member) => {
      store.dispatch(memberJoined(member));
    });

    const unsubscribeRemoved = signalR.onMemberRemoved(async (member) => {
      // Being removed yourself closes the party; anyone else just leaves
      // the members list.
      if (member.userId === (await getUserId())) {
        store.dispatch(removedFromParty(member));
        // No longer a member: stop receiving this party's events.
        await signalR.leaveParty(member.partyId);
      } else {
        store.dispatch(memberRemoved(member));
      }
    });

    // The server rejected this device's stored credentials and a fresh
    // identity was registered (see userIdentity): tell the user their
    // previous parties are gone and refresh the list for the new identity.
    const unsubscribeReset = onIdentityReset(() => {
      const title = "Device re-registered";
      const message =
        "The server no longer recognized this device, so it was registered " +
        "as a new user. Parties you belonged to are no longer accessible.";
      if (Platform.OS === "web") {
        window.alert(`${title}\n\n${message}`);
      } else {
        Alert.alert(title, message);
      }
      store.dispatch(fetchParties());
    });

    signalR.connect();

    return () => {
      unsubscribeJoined();
      unsubscribeRemoved();
      unsubscribeReset();
      signalR.disconnect();
    };
  }, []);

  return (
    <Provider store={store}>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <AnimatedSplashOverlay />
        <AppTabs />
      </ThemeProvider>
    </Provider>
  );
}
