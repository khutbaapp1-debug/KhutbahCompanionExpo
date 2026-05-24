import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  PanResponder,
  Text,
  TouchableOpacity,
  View,
  ViewToken,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ReciterDropdown from '../../src/components/quran/ReciterDropdown';
import VerseNumber from '../../src/components/quran/VerseNumber';
import { getSurah } from '../../src/lib/quran';
import type { Ayah, Surah } from '../../src/lib/quran';
import { getAyahAudioUrl } from '../../src/lib/quran-audio';
import type { ReciterId } from '../../src/lib/quran-audio';
import { getBookmark, getLastPosition, setBookmark, setLastPosition } from '../../src/lib/quran-bookmark';
import { getSurahTranslation } from '../../src/lib/quran-translation';
import type { AyahTranslation } from '../../src/lib/quran-translation';

type ViewMode = 'page' | 'detailed';
type SoundInstance = { stopAsync(): Promise<unknown>; unloadAsync(): Promise<unknown> };

const DEFAULT_RECITER: ReciterId = 'ar.alafasy';
const FONT_SIZES: number[] = [20, 24, 28, 32];

export default function SurahReader() {
  const { surahNumber: surahParam } = useLocalSearchParams<{ surahNumber: string }>();
  const surahNum = parseInt(surahParam ?? '1', 10);
  const insets = useSafeAreaInsets();

  const [surah, setSurah] = useState<Surah | null>(null);
  const [translations, setTranslations] = useState<AyahTranslation[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('page');
  const [showTranslation, setShowTranslation] = useState(false);
  const [reciterId, setReciterId] = useState<ReciterId>(DEFAULT_RECITER);
  const [playingAyah, setPlayingAyah] = useState<number | null>(null);
  const [bookmarkedAyah, setBookmarkedAyah] = useState<number | null>(null);
  const [fontSizeIdx, setFontSizeIdx] = useState(1);

  const soundRef = useRef<SoundInstance | null>(null);
  const listRef = useRef<FlatList<Ayah>>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 });

  const fontSize = FONT_SIZES[fontSizeIdx] ?? 24;

  useEffect(() => {
    try {
      setSurah(getSurah(surahNum));
    } catch {
      router.back();
    }
  }, [surahNum]);

  useEffect(() => {
    if (!showTranslation || translations.length > 0) return;
    getSurahTranslation(surahNum).then(setTranslations);
  }, [showTranslation, surahNum, translations.length]);

  useEffect(() => {
    getBookmark().then((bm) => {
      if (bm?.surahNumber === surahNum) setBookmarkedAyah(bm.ayahNumber);
    });
    getLastPosition().then((pos) => {
      if (pos?.surahNumber === surahNum) {
        setTimeout(() => {
          listRef.current?.scrollToIndex({ index: pos.ayahNumber - 1, animated: false });
        }, 400);
      }
    });
  }, [surahNum]);

  useEffect(
    () => () => {
      void soundRef.current?.unloadAsync();
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    },
    [],
  );

  const stopAndUnload = useCallback(async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch {
        // sound may already be unloaded
      }
      soundRef.current = null;
    }
    setPlayingAyah(null);
  }, []);

  const handlePlayAyah = useCallback(
    async (ayahNumber: number) => {
      if (playingAyah === ayahNumber) {
        await stopAndUnload();
        return;
      }
      await stopAndUnload();
      try {
        const { Audio } = await import('expo-av');
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
        const url = getAyahAudioUrl(surahNum, ayahNumber, reciterId);
        const { sound } = await Audio.Sound.createAsync(
          { uri: url },
          { shouldPlay: true },
          (status) => {
            if (status.isLoaded && status.didJustFinish) {
              setPlayingAyah(null);
              soundRef.current = null;
            }
          },
        );
        soundRef.current = sound;
        setPlayingAyah(ayahNumber);
      } catch {
        setPlayingAyah(null);
        Alert.alert(
          'Audio Unavailable',
          'Audio requires a development build. Streaming will work once the app is built natively.',
        );
      }
    },
    [playingAyah, surahNum, reciterId, stopAndUnload],
  );

  const handleBookmarkAyah = useCallback(
    (ayahNumber: number) => {
      if (bookmarkedAyah === ayahNumber) {
        Alert.alert('Remove Bookmark', 'Remove bookmark from this verse?', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => {
              setBookmarkedAyah(null);
            },
          },
        ]);
      } else {
        setBookmarkedAyah(ayahNumber);
        void setBookmark(surahNum, ayahNumber);
        Alert.alert(
          'Bookmark Saved',
          `Verse ${ayahNumber} of ${surah?.englishName ?? 'this surah'} bookmarked.`,
        );
      }
    },
    [bookmarkedAyah, surahNum, surah],
  );

  const handleViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (!viewableItems.length) return;
      const firstAyah = viewableItems[0].item as Ayah;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        void setLastPosition(surahNum, firstAyah.numberInSurah);
      }, 2000);
    },
    [surahNum],
  );

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > 15 && Math.abs(gs.dx) > Math.abs(gs.dy) * 1.5,
      onPanResponderRelease: (_, gs) => {
        if (gs.dx < -80 && surahNum < 114) router.replace(`/quran/${surahNum + 1}`);
        else if (gs.dx > 80 && surahNum > 1) router.replace(`/quran/${surahNum - 1}`);
      },
    }),
  ).current;

  if (!surah) return null;

  const showBasmalah = surahNum !== 1 && surahNum !== 9;
  const basmalah = getSurah(1).ayahs[0].text;

  return (
    <View style={{ flex: 1, backgroundColor: 'white' }} {...panResponder.panHandlers}>
      {/* Custom header */}
      <View
        style={{
          paddingTop: insets.top,
          backgroundColor: 'white',
          borderBottomWidth: 1,
          borderBottomColor: '#F3F4F6',
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 8,
            paddingVertical: 8,
          }}
        >
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 6 }}>
            <Ionicons name="chevron-back" size={24} color="#0F766E" />
          </TouchableOpacity>

          <Text
            style={{
              flex: 1,
              fontFamily: 'Inter_600SemiBold',
              fontSize: 16,
              color: '#111827',
              textAlign: 'center',
            }}
            numberOfLines={1}
          >
            {surah.englishName}
          </Text>

          {/* Font size controls */}
          <TouchableOpacity
            onPress={() => setFontSizeIdx((i) => Math.max(0, i - 1))}
            style={{ paddingHorizontal: 6, paddingVertical: 4 }}
            disabled={fontSizeIdx === 0}
          >
            <Text
              style={{
                fontFamily: 'Inter_500Medium',
                fontSize: 13,
                color: fontSizeIdx === 0 ? '#D1D5DB' : '#0F766E',
              }}
            >
              A-
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setFontSizeIdx((i) => Math.min(FONT_SIZES.length - 1, i + 1))}
            style={{ paddingHorizontal: 6, paddingVertical: 4 }}
            disabled={fontSizeIdx === FONT_SIZES.length - 1}
          >
            <Text
              style={{
                fontFamily: 'Inter_600SemiBold',
                fontSize: 15,
                color: fontSizeIdx === FONT_SIZES.length - 1 ? '#D1D5DB' : '#0F766E',
              }}
            >
              A+
            </Text>
          </TouchableOpacity>

          {/* Prev / Next arrows */}
          <TouchableOpacity
            onPress={() => surahNum > 1 && router.replace(`/quran/${surahNum - 1}`)}
            style={{ padding: 4 }}
            disabled={surahNum <= 1}
          >
            <Ionicons
              name="chevron-back-circle-outline"
              size={22}
              color={surahNum <= 1 ? '#D1D5DB' : '#0F766E'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => surahNum < 114 && router.replace(`/quran/${surahNum + 1}`)}
            style={{ padding: 4, marginRight: 4 }}
            disabled={surahNum >= 114}
          >
            <Ionicons
              name="chevron-forward-circle-outline"
              size={22}
              color={surahNum >= 114 ? '#D1D5DB' : '#0F766E'}
            />
          </TouchableOpacity>
        </View>

        <ReciterDropdown selectedId={reciterId} onSelect={setReciterId} />

        {/* View mode + translation toggle */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderTopWidth: 1,
            borderTopColor: '#F3F4F6',
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: '#F3F4F6',
              borderRadius: 8,
              padding: 2,
            }}
          >
            {(['page', 'detailed'] as ViewMode[]).map((mode) => (
              <TouchableOpacity
                key={mode}
                onPress={() => setViewMode(mode)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                  borderRadius: 6,
                  backgroundColor: viewMode === mode ? 'white' : 'transparent',
                }}
              >
                <Text
                  style={{
                    fontFamily: viewMode === mode ? 'Inter_600SemiBold' : 'Inter_400Regular',
                    fontSize: 13,
                    color: viewMode === mode ? '#0F766E' : '#6B7280',
                    textTransform: 'capitalize',
                  }}
                >
                  {mode}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ flex: 1 }} />

          <TouchableOpacity
            onPress={() => setShowTranslation((v) => !v)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 6,
              borderRadius: 8,
              backgroundColor: showTranslation ? '#0F766E' : '#F3F4F6',
            }}
          >
            <Text
              style={{
                fontFamily: 'Inter_600SemiBold',
                fontSize: 13,
                color: showTranslation ? 'white' : '#6B7280',
              }}
            >
              EN
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Surah banner */}
      <View
        style={{
          backgroundColor: '#0F766E',
          paddingVertical: 20,
          paddingHorizontal: 24,
          alignItems: 'center',
        }}
      >
        <Text style={{ fontFamily: 'KFGQPCHafs', fontSize: 28, color: 'white' }}>
          {surah.name}
        </Text>
        <Text
          style={{
            fontFamily: 'Inter_400Regular',
            fontSize: 13,
            color: 'rgba(255,255,255,0.8)',
            marginTop: 4,
          }}
        >
          {surah.englishName} · {surah.numberOfAyahs} verses · {surah.revelationType}
        </Text>
        {showBasmalah && (
          <Text
            style={{
              fontFamily: 'KFGQPCHafs',
              fontSize: 18,
              color: 'rgba(255,255,255,0.9)',
              marginTop: 12,
            }}
          >
            {basmalah}
          </Text>
        )}
      </View>

      {/* Verse list */}
      <FlatList
        ref={listRef}
        data={surah.ayahs}
        keyExtractor={(ayah) => String(ayah.numberInSurah)}
        onViewableItemsChanged={handleViewableItemsChanged}
        viewabilityConfig={viewabilityConfig.current}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        onScrollToIndexFailed={() => {}}
        renderItem={({ item: ayah }) => {
          const translation = translations.find((t) => t.numberInSurah === ayah.numberInSurah);
          const isPlaying = playingAyah === ayah.numberInSurah;
          const isBookmarked = bookmarkedAyah === ayah.numberInSurah;

          if (viewMode === 'page') {
            return (
              <View
                style={{
                  flexDirection: 'row',
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: '#F9FAFB',
                  backgroundColor: isPlaying ? '#F0FDFA' : isBookmarked ? '#FFFBEB' : 'white',
                }}
              >
                <View style={{ marginTop: 6, marginRight: 12 }}>
                  <VerseNumber
                    number={ayah.numberInSurah}
                    onPress={() => void handlePlayAyah(ayah.numberInSurah)}
                    onLongPress={() => handleBookmarkAyah(ayah.numberInSurah)}
                    isBookmarked={isBookmarked}
                    isPlaying={isPlaying}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontFamily: 'KFGQPCHafs',
                      fontSize,
                      color: '#111827',
                      textAlign: 'right',
                      writingDirection: 'rtl',
                      lineHeight: fontSize * 1.9,
                    }}
                  >
                    {ayah.text}
                  </Text>
                  {showTranslation && translation && (
                    <Text
                      style={{
                        fontFamily: 'Inter_400Regular',
                        fontSize: 13,
                        color: '#4B5563',
                        marginTop: 6,
                        lineHeight: 20,
                        paddingTop: 6,
                        borderTopWidth: 1,
                        borderTopColor: '#F3F4F6',
                      }}
                    >
                      {translation.text}
                    </Text>
                  )}
                </View>
              </View>
            );
          }

          // Detailed card view
          return (
            <View
              style={{
                marginHorizontal: 12,
                marginVertical: 6,
                borderRadius: 12,
                backgroundColor: isPlaying ? '#F0FDFA' : isBookmarked ? '#FFFBEB' : '#F9FAFB',
                borderWidth: 1,
                borderColor: isPlaying ? '#0D9488' : isBookmarked ? '#FCD34D' : '#F3F4F6',
                padding: 16,
              }}
            >
              <Text
                style={{
                  fontFamily: 'KFGQPCHafs',
                  fontSize,
                  color: '#111827',
                  textAlign: 'right',
                  writingDirection: 'rtl',
                  lineHeight: fontSize * 1.9,
                }}
              >
                {ayah.text}
              </Text>
              {showTranslation && translation && (
                <Text
                  style={{
                    fontFamily: 'Inter_400Regular',
                    fontSize: 13,
                    color: '#4B5563',
                    marginTop: 8,
                    lineHeight: 20,
                    paddingTop: 8,
                    borderTopWidth: 1,
                    borderTopColor: '#E5E7EB',
                  }}
                >
                  {translation.text}
                </Text>
              )}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: 12,
                }}
              >
                <VerseNumber
                  number={ayah.numberInSurah}
                  onPress={() => void handlePlayAyah(ayah.numberInSurah)}
                  onLongPress={() => handleBookmarkAyah(ayah.numberInSurah)}
                  isBookmarked={isBookmarked}
                  isPlaying={isPlaying}
                />
                <View style={{ flexDirection: 'row' }}>
                  <TouchableOpacity
                    onPress={() => void handlePlayAyah(ayah.numberInSurah)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 8,
                      backgroundColor: isPlaying ? '#0F766E' : '#E5E7EB',
                      marginRight: 8,
                    }}
                  >
                    <Ionicons
                      name={isPlaying ? 'pause' : 'play'}
                      size={14}
                      color={isPlaying ? 'white' : '#374151'}
                    />
                    <Text
                      style={{
                        fontFamily: 'Inter_500Medium',
                        fontSize: 12,
                        color: isPlaying ? 'white' : '#374151',
                        marginLeft: 4,
                      }}
                    >
                      {isPlaying ? 'Pause' : 'Play'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleBookmarkAyah(ayah.numberInSurah)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 8,
                      backgroundColor: isBookmarked ? '#FBBF24' : '#E5E7EB',
                    }}
                  >
                    <Ionicons
                      name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
                      size={14}
                      color={isBookmarked ? 'white' : '#374151'}
                    />
                    <Text
                      style={{
                        fontFamily: 'Inter_500Medium',
                        fontSize: 12,
                        color: isBookmarked ? 'white' : '#374151',
                        marginLeft: 4,
                      }}
                    >
                      Save
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}
