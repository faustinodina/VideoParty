import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router";
import { useEffect } from "react";
import { useColorScheme } from "react-native";
import { Provider } from "react-redux";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import AppTabs from "@/components/app-tabs";
import signalR from "@/services/signalRService";
import { store } from "@/store";
import { memberJoined } from "@/store/partySlice";

export default function TabLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    signalR.on("VideoStarted", (videoId) => {
      console.log("Playing video:", videoId);
    });

    // Bridge SignalR events into the store so any screen can select them.
    const unsubscribe = signalR.onMemberJoined((member) => {
      store.dispatch(memberJoined(member));
    });

    signalR.connect();

    return () => {
      unsubscribe();
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
