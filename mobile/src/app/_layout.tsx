import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router";
import { useColorScheme } from "react-native";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import AppTabs from "@/components/app-tabs";
import signalR from "@/services/signalRService";
import { useEffect } from "react";

export default function TabLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    signalR.on("VideoStarted", (videoId) => {
      console.log("Playing video:", videoId);
    });

    signalR.connect();

    return () => {
      signalR.disconnect();
    };
  }, []);

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <AppTabs />
    </ThemeProvider>
  );
}
