import {
  DarkTheme,
  DefaultTheme,
  router,
  Stack,
  ThemeProvider,
} from "expo-router";
import {
  ShareIntentProvider,
  useShareIntentContext,
} from "expo-share-intent";
import { useEffect, useState } from "react";
import { Alert, Platform, useColorScheme } from "react-native";
import { Provider } from "react-redux";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import RegisterScreen from "@/components/register-screen";
import signalR from "@/services/signalRService";
import { getUserId, isRegistered, onIdentityReset } from "@/services/userIdentity";
import { store } from "@/store";
import {
  addPendingVideo,
  fetchParties,
  memberJoined,
  memberRemoved,
  removedFromParty,
  videoAdded,
  videoRemoved,
  videoShared,
} from "@/store/partySlice";

// Receives Android share-sheet intents (e.g. Share → VideoParty from
// YouTube): stores the link, posts it to its party, and lands on the Party
// tab. Rendered inside ShareIntentProvider and alongside the Stack so
// navigation is available.
function ShareIntentHandler() {
  const { hasShareIntent, shareIntent, resetShareIntent } =
    useShareIntentContext();

  useEffect(() => {
    if (!hasShareIntent) return;
    // YouTube shares arrive as text; webUrl is the extracted link when the
    // text contains one.
    const url = shareIntent.webUrl ?? shareIntent.text;
    if (url) {
      store.dispatch(videoShared(url));
      // Automatic post to the party that launched Add Video (or the open
      // party). Without one this is a no-op (see the thunk's condition):
      // the link stays pending until a party can take it.
      store.dispatch(addPendingVideo());
      router.navigate("/videos");
    }
    resetShareIntent();
  }, [hasShareIntent, shareIntent, resetShareIntent]);

  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  // null while the stored credentials are being read; false shows the
  // first-launch registration screen instead of the app.
  const [registered, setRegistered] = useState<boolean | null>(null);

  useEffect(() => {
    isRegistered().then(setRegistered);
  }, []);

  useEffect(() => {
    // Everything below needs an identity: SignalR's token fetch would
    // otherwise fail (and auto-register) before the user chose a name.
    if (!registered) return;
    signalR.on("VideoStarted", (videoId) => {
      console.log("Playing video:", videoId);
    });

    // Bridge SignalR events into the store so any screen can select them.
    const unsubscribeJoined = signalR.onMemberJoined((member) => {
      store.dispatch(memberJoined(member));
    });

    const unsubscribeVideoAdded = signalR.onVideoAdded((video) => {
      store.dispatch(videoAdded(video));
    });

    const unsubscribeVideoRemoved = signalR.onVideoRemoved((video) => {
      store.dispatch(videoRemoved(video));
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
      unsubscribeVideoAdded();
      unsubscribeVideoRemoved();
      unsubscribeRemoved();
      unsubscribeReset();
      signalR.disconnect();
    };
  }, [registered]);

  return (
    <ShareIntentProvider>
      <Provider store={store}>
        <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
          <AnimatedSplashOverlay />
          {registered === false && (
            <RegisterScreen onRegistered={() => setRegistered(true)} />
          )}
          {registered && (
            <>
              <ShareIntentHandler />
              <Stack screenOptions={{ headerShown: false }} />
            </>
          )}
        </ThemeProvider>
      </Provider>
    </ShareIntentProvider>
  );
}
