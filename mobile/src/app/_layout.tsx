import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router";
import { useEffect } from "react";
import { useColorScheme } from "react-native";
import { Provider } from "react-redux";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import AppTabs from "@/components/app-tabs";
import signalR from "@/services/signalRService";
import { getUserId } from "@/services/userIdentity";
import { store } from "@/store";
import {
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

    signalR.connect();

    return () => {
      unsubscribeJoined();
      unsubscribeRemoved();
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
