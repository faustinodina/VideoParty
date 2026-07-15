import { Image } from 'expo-image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Linking, StyleSheet, View } from 'react-native';
import { CastButton, useCastChannel } from 'react-native-google-cast';
import {
  Button,
  Card,
  IconButton,
  Surface,
  Text,
  useTheme,
} from 'react-native-paper';

import AppHeader from '@/components/app-header';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
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
  removeVideo,
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
  // What the receiver last reported; drives the Play/Stop toggle.
  const [tvState, setTvState] = useState<CastStatus['state']>('idle');
  // The channel callback below is created once, so it reads the playlist
  // and the channel itself through refs to see their current values.
  const videosRef = useRef(videos);
  const channelRef = useRef<ReturnType<typeof useCastChannel>>(null);
  // The id of the video the TV is playing. Not simply the top of the list:
  // the organizer can remove any row — including the playing one — while
  // it plays, so what ended must be identified, not assumed.
  const playingIdRef = useRef<string | null>(null);

  // Non-null only while a cast session is connected; also how the receiver
  // reports playback state and failures (most importantly embed-blocked
  // videos).
  const castChannel = useCastChannel(
    CAST_NAMESPACE,
    useCallback(
      (message: Record<string, any> | string) => {
        if (typeof message === 'string' || message.type !== 'status') return;
        const status = message as CastStatus;
        setTvState(status.state);
        if (status.state === 'error') {
          setCastError(
            status.embedBlocked
              ? "This video can't play on the TV: its owner disabled embedding. It still plays in YouTube."
              : `The TV could not play this video (error ${status.errorCode}).`
          );
        }
        if (status.state === 'ended') {
          // Auto-advance: the finished video leaves the playlist (for
          // every member, via removeVideo) and the next castable one
          // starts. Only the organizer's phone has a cast session, so no
          // one else issues the removal. The finished video is usually the
          // top of the list, but may already be gone (removed manually
          // while it played), in which case there is nothing to delete.
          const list = videosRef.current;
          const ended = list.find(
            (v) => v.partyVideoId === playingIdRef.current
          );
          if (ended) {
            dispatch(removeVideo(ended));
          }
          const next = list.find(
            (v) => v.partyVideoId !== playingIdRef.current
          );
          const nextId = next ? extractYouTubeVideoId(next.url) : null;
          if (next && nextId && channelRef.current) {
            setCastError(null);
            const command: CastCommand = { type: 'play', videoId: nextId };
            channelRef.current.sendMessage(command);
            playingIdRef.current = next.partyVideoId;
            setTvState('loading');
          } else {
            playingIdRef.current = null;
          }
        }
      },
      [dispatch]
    )
  );

  // Keep the refs the once-created channel callback reads in sync.
  useEffect(() => {
    videosRef.current = videos;
    channelRef.current = castChannel;
  });

  // The single TV control plays the top of the playlist; everything below
  // it is queue. Stop covers loading too, so a mis-tap is cancelable.
  const topVideoId = videos.length
    ? extractYouTubeVideoId(videos[0].url)
    : null;
  const tvPlaying =
    tvState === 'playing' || tvState === 'loading' || tvState === 'paused';

  const toggleTv = () => {
    if (!castChannel) return;
    if (tvPlaying) {
      const command: CastCommand = { type: 'stop' };
      castChannel.sendMessage(command);
      playingIdRef.current = null;
      return;
    }
    if (!topVideoId) return;
    setCastError(null);
    const command: CastCommand = { type: 'play', videoId: topVideoId };
    castChannel.sendMessage(command);
    playingIdRef.current = videos[0].partyVideoId;
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
      <View
        style={[styles.screen, { backgroundColor: theme.colors.background }]}
      >
        <AppHeader />
        <View style={styles.placeholder}>
          <Text
            variant="bodyMedium"
            style={[styles.empty, { color: theme.colors.onSurfaceVariant }]}
          >
            Open a party from the Parties tab to see its videos here.
          </Text>
          {pendingVideoUrl && (
            <Text
              variant="bodySmall"
              style={[styles.empty, { color: theme.colors.onSurfaceVariant }]}
            >
              A video link is waiting: open a party to add it.
            </Text>
          )}
        </View>
      </View>
    );
  }

  return (
    <View
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
    >
      <AppHeader />
      <FlatList
        style={styles.list}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        data={videos}
        keyExtractor={(item) => item.partyVideoId}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text variant="headlineMedium">{activeParty.name}</Text>
            <View style={styles.actionRow}>
              <Button mode="contained" icon="plus" onPress={addVideo}>
                Add Video
              </Button>
              {isOrganizer && (
                <CastButton
                  style={styles.castButton}
                  tintColor={theme.colors.onSurface}
                />
              )}
            </View>
            {castError && (
              <Text variant="bodySmall" style={{ color: theme.colors.error }}>
                {castError}
              </Text>
            )}
            {pendingVideoUrl && (
              <Surface mode="flat" style={styles.pendingVideo}>
                <Text
                  variant="bodySmall"
                  numberOfLines={2}
                  style={styles.pendingVideoUrl}
                >
                  Video to add: {pendingVideoUrl}
                </Text>
                <Button
                  compact
                  mode="text"
                  onPress={() => dispatch(addPendingVideo())}
                  disabled={addingVideo}
                  loading={addingVideo}
                >
                  Add
                </Button>
                <IconButton
                  icon="close"
                  size={18}
                  onPress={() => dispatch(clearPendingVideo())}
                  disabled={addingVideo}
                />
              </Surface>
            )}
            {addVideoError && (
              <Text variant="bodySmall" style={{ color: theme.colors.error }}>
                Could not add the video: {addVideoError}
              </Text>
            )}
            <View style={styles.playlistRow}>
              <Text variant="titleMedium">Playlist</Text>
              {castChannel && (tvPlaying || topVideoId) && (
                <Button
                  compact
                  mode="text"
                  icon={tvPlaying ? 'stop' : 'play'}
                  onPress={toggleTv}
                >
                  {tvPlaying ? 'Stop' : 'Play on TV'}
                </Button>
              )}
            </View>
          </View>
        }
        renderItem={({ item }) => (
          // Until in-party playback exists, tapping a row opens the video
          // in YouTube.
          <Card mode="contained" onPress={() => Linking.openURL(item.url)}>
            <View style={styles.videoRow}>
              {item.thumbnailUrl && (
                <Image
                  source={{ uri: item.thumbnailUrl }}
                  style={styles.thumbnail}
                  contentFit="cover"
                />
              )}
              <View style={styles.videoInfo}>
                <Text variant="titleSmall" numberOfLines={2}>
                  {item.title ?? item.url}
                </Text>
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.onSurfaceVariant }}
                >
                  added by {addedBy(item.addedByUserId)}
                </Text>
              </View>
              {isOrganizer && (
                <IconButton
                  icon="delete-outline"
                  onPress={() => dispatch(removeVideo(item))}
                />
              )}
            </View>
          </Card>
        )}
        ListEmptyComponent={
          <Text
            variant="bodyMedium"
            style={[styles.empty, { color: theme.colors.onSurfaceVariant }]}
          >
            No videos yet. Use Add Video and share a link back from YouTube.
          </Text>
        }
      />
    </View>
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
  castButton: {
    width: 40,
    height: 40,
    alignSelf: 'center',
  },
  playlistRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pendingVideo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingLeft: Spacing.three,
    borderRadius: Spacing.two,
    borderCurve: 'continuous',
  },
  pendingVideoUrl: {
    flex: 1,
  },
  videoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
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
  },
  empty: {
    textAlign: 'center',
    paddingVertical: Spacing.four,
  },
});
