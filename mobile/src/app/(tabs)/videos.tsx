import { Image } from 'expo-image';
import { useCallback, useState } from 'react';
import { FlatList, Linking, Pressable, StyleSheet } from 'react-native';
import { CastButton, useCastChannel } from 'react-native-google-cast';

import AppHeader from '@/components/app-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  CAST_NAMESPACE,
  CastCommand,
  CastStatus,
  extractYouTubeVideoId,
} from '@/services/castService';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  addPendingVideo,
  clearPendingVideo,
  selectActiveParty,
  videoRequested,
} from '@/store/partySlice';

export default function VideosScreen() {
  const theme = useTheme();
  const dispatch = useAppDispatch();

  const activeParty = useAppSelector(selectActiveParty);
  const members = useAppSelector((state) => state.party.members);
  const videos = useAppSelector((state) => state.party.videos);
  const pendingVideoUrl = useAppSelector(
    (state) => state.party.pendingVideoUrl
  );
  const addingVideo = useAppSelector((state) => state.party.addingVideo);
  const addVideoError = useAppSelector((state) => state.party.addVideoError);

  // Casting is organizer-only: the organizer's phone is at the party, next
  // to the TV. Guests never see the cast UI.
  const isOrganizer = activeParty?.role === 'organizer';
  const [castError, setCastError] = useState<string | null>(null);
  // Non-null only while a cast session is connected; also how the receiver
  // reports playback failures (most importantly embed-blocked videos).
  const castChannel = useCastChannel(
    CAST_NAMESPACE,
    useCallback((message: Record<string, any> | string) => {
      if (typeof message === 'string' || message.type !== 'status') return;
      const status = message as CastStatus;
      if (status.state === 'error') {
        setCastError(
          status.embedBlocked
            ? "This video can't play on the TV: its owner disabled embedding. It still plays in YouTube."
            : `The TV could not play this video (error ${status.errorCode}).`
        );
      }
    }, [])
  );

  const playOnTv = (url: string) => {
    const videoId = extractYouTubeVideoId(url);
    if (!videoId || !castChannel) return;
    setCastError(null);
    const command: CastCommand = { type: 'play', videoId };
    castChannel.sendMessage(command);
  };

  // Opens the YouTube app when installed; otherwise the website. openURL
  // (not canOpenURL) because Android package-visibility rules make
  // canOpenURL report false for apps the manifest does not declare.
  const addVideo = async () => {
    if (!activeParty) return;
    // The share sheet gives the returning link no context; remembering the
    // party here is what lets ShareIntentHandler post it automatically.
    dispatch(videoRequested(activeParty.partyId));
    try {
      await Linking.openURL('vnd.youtube://');
    } catch {
      await Linking.openURL('https://www.youtube.com/');
    }
  };

  // Members are the active party's; a video whose adder has since left the
  // party gets the fallback.
  const addedBy = (userId: string) =>
    members.find((m) => m.userId === userId)?.displayName ??
    'a former member';

  if (!activeParty) {
    return (
      <ThemedView style={styles.screen}>
        <AppHeader />
        <ThemedView style={styles.placeholder}>
          <ThemedText themeColor="textSecondary" style={styles.empty}>
            Open a party from the Parties tab to see its videos here.
          </ThemedText>
          {pendingVideoUrl && (
            <ThemedText
              type="small"
              themeColor="textSecondary"
              style={styles.empty}
            >
              A video link is waiting: open a party to add it.
            </ThemedText>
          )}
        </ThemedView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.screen}>
      <AppHeader />
      <FlatList
        style={[styles.list, { backgroundColor: theme.background }]}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        data={videos}
        keyExtractor={(item) => item.partyVideoId}
        ListHeaderComponent={
          <ThemedView style={styles.header}>
            <ThemedText type="title">{activeParty.name}</ThemedText>
            <ThemedView style={styles.actionRow}>
              <Pressable
                onPress={addVideo}
                style={({ pressed }) => [
                  styles.addButton,
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText type="smallBold" style={styles.addButtonLabel}>
                  Add Video
                </ThemedText>
              </Pressable>
              {isOrganizer && (
                <CastButton style={styles.castButton} tintColor={theme.text} />
              )}
            </ThemedView>
            {castError && (
              <ThemedText type="small" themeColor="danger">
                {castError}
              </ThemedText>
            )}
            {pendingVideoUrl && (
              <ThemedView type="backgroundElement" style={styles.pendingVideo}>
                <ThemedText type="small" style={styles.pendingVideoUrl}>
                  Video to add: {pendingVideoUrl}
                </ThemedText>
                <Pressable
                  onPress={() => dispatch(addPendingVideo())}
                  disabled={addingVideo}
                  hitSlop={Spacing.two}
                >
                  <ThemedText type="smallBold" style={styles.addAction}>
                    {addingVideo ? 'Adding…' : 'Add'}
                  </ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => dispatch(clearPendingVideo())}
                  disabled={addingVideo}
                  hitSlop={Spacing.two}
                >
                  <ThemedText type="small" themeColor="danger">
                    Dismiss
                  </ThemedText>
                </Pressable>
              </ThemedView>
            )}
            {addVideoError && (
              <ThemedText type="small" themeColor="danger">
                Could not add the video: {addVideoError}
              </ThemedText>
            )}
            <ThemedText type="subtitle">Playlist</ThemedText>
          </ThemedView>
        }
        renderItem={({ item }) => (
          // Until in-party playback exists, tapping a row opens the video
          // in YouTube.
          <Pressable
            onPress={() => Linking.openURL(item.url)}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <ThemedView type="backgroundElement" style={styles.videoRow}>
              {item.thumbnailUrl && (
                <Image
                  source={{ uri: item.thumbnailUrl }}
                  style={styles.thumbnail}
                  contentFit="cover"
                />
              )}
              <ThemedView style={styles.videoInfo}>
                <ThemedText type="smallBold" numberOfLines={2}>
                  {item.title ?? item.url}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  added by {addedBy(item.addedByUserId)}
                </ThemedText>
              </ThemedView>
              {castChannel && extractYouTubeVideoId(item.url) && (
                <Pressable
                  onPress={() => playOnTv(item.url)}
                  hitSlop={Spacing.two}
                >
                  <ThemedText type="smallBold" style={styles.playOnTv}>
                    ▶ TV
                  </ThemedText>
                </Pressable>
              )}
            </ThemedView>
          </Pressable>
        )}
        ListEmptyComponent={
          <ThemedText themeColor="textSecondary" style={styles.empty}>
            No videos yet. Use Add Video and share a link back from YouTube.
          </ThemedText>
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  content: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    gap: Spacing.three,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  addButton: {
    backgroundColor: '#208AEF',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
    alignSelf: 'flex-start',
  },
  addButtonLabel: {
    color: '#ffffff',
  },
  castButton: {
    width: 40,
    height: 40,
    alignSelf: 'center',
  },
  playOnTv: {
    // Same accent as the Add Video button.
    color: '#208AEF',
  },
  pressed: {
    opacity: 0.7,
  },
  pendingVideo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    borderCurve: 'continuous',
  },
  pendingVideoUrl: {
    flex: 1,
  },
  addAction: {
    // Same accent as the Add Video button.
    color: '#208AEF',
  },
  videoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
    borderCurve: 'continuous',
  },
  thumbnail: {
    // 16:9, like the YouTube thumbnails it shows.
    width: 96,
    height: 54,
    borderRadius: Spacing.one,
    // Behind the image while it loads and for letterboxed sources.
    backgroundColor: '#00000020',
  },
  videoInfo: {
    flex: 1,
    gap: Spacing.half,
    backgroundColor: 'transparent',
  },
  empty: {
    textAlign: 'center',
    paddingVertical: Spacing.four,
  },
});
