import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

const IS_EXPO_GO = Constants.appOwnership === 'expo';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  PanResponder,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  ViewToken,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ReciterDropdown from '../../src/components/quran/ReciterDropdown';
import { getSurah } from '../../src/lib/quran';
import type { Ayah, Surah } from '../../src/lib/quran';
import { getAyahAudioUrl } from '../../src/lib/quran-audio';
import type { ReciterId } from '../../src/lib/quran-audio';
import { getBookmark, getQuranFontSize, getQuranViewMode, setBookmark, setLastPosition, setLastSurah, setQuranFontSize, setQuranViewMode } from '../../src/lib/quran-bookmark';
import type { Bookmark } from '../../src/lib/quran-bookmark';
import { getSurahTranslation } from '../../src/lib/quran-translation';
import type { AyahTranslation } from '../../src/lib/quran-translation';

type ViewMode = 'page' | 'detailed';
type SoundInstance = { stopAsync(): Promise<unknown>; unloadAsync(): Promise<unknown> };

const DEFAULT_RECITER: ReciterId = 'ar.alafasy';
const FONT_SIZES: number[] = [20, 24, 28, 32];

function estimateVerseOffset(
  ayahs: Ayah[],
  targetAyahNumber: number,
  fontSize: number,
  cardWidth: number,
): number {
  const lineHeight = fontSize * 2;
  // Arabic text with tashkeel averages ~3.2 Unicode code points per visible glyph,
  // so multiply raw glyph capacity by that ratio to get true chars-per-line.
  const DIACRITIC_RATIO = 4.8;
  const charsPerLine = Math.floor((cardWidth * 0.85) / (fontSize * 0.6)) * DIACRITIC_RATIO;
  let offset = 0;
  for (let i = 0; i < targetAyahNumber - 1; i++) {
    const ayah = ayahs[i];
    if (!ayah) break;
    const lines = Math.ceil(ayah.text.length / Math.max(charsPerLine, 1));
    offset += lines * lineHeight;
    offset += lineHeight * 0.55; // verse marker row
  }
  return offset;
}

export default function SurahReader() {
  const { surahNumber: surahParam } = useLocalSearchParams<{ surahNumber: string }>();
  const surahNum = parseInt(surahParam ?? '1', 10);
  const insets = useSafeAreaInsets();

  const [surah, setSurah] = useState<Surah | null>(null);
  const [translations, setTranslations] = useState<AyahTranslation[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('page');
  const [reciterId, setReciterId] = useState<ReciterId>(DEFAULT_RECITER);
  const [playingAyah, setPlayingAyah] = useState<number | null>(null);
  const [loadingAyah, setLoadingAyah] = useState<number | null>(null);
  const [bookmarkedAyah, setBookmarkedAyah] = useState<number | null>(null);
  const [fontSizeIdx, setFontSizeIdx] = useState(1);
  const [activeVerse, setActiveVerse] = useState<number | null>(null);
  const [bookmarkScrollY, setBookmarkScrollY] = useState<number | undefined>(undefined);
  const [bookmarkFontSizeIdx, setBookmarkFontSizeIdx] = useState<number | undefined>(undefined);

  const soundRef = useRef<SoundInstance | null>(null);
  const listRef = useRef<FlatList<Ayah>>(null);
  const pageScrollRef = useRef<ScrollView>(null);
  const pageScrollYRef = useRef(0);
  const itemHeightsRef = useRef<Record<number, number>>({});
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentAyahRef = useRef(1);
  const fontSizeLoadedRef = useRef(false);
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 });

  const fontSize = FONT_SIZES[fontSizeIdx] ?? 24;
  const cardWidth = Dimensions.get('window').width - 32;

  useEffect(() => {
    try {
      setSurah(getSurah(surahNum));
      void setLastSurah(surahNum);
    } catch {
      router.back();
    }
  }, [surahNum]);

  // Load persisted font size and view mode once on mount
  useEffect(() => {
    getQuranFontSize().then((idx) => {
      fontSizeLoadedRef.current = true;
      setFontSizeIdx(idx);
    });
    getQuranViewMode().then(setViewMode);
  }, []);

  // Persist font size whenever it changes (skip until loaded to avoid overwriting with default)
  useEffect(() => {
    if (!fontSizeLoadedRef.current) return;
    void setQuranFontSize(fontSizeIdx);
  }, [fontSizeIdx]);

  // Persist view mode whenever it changes
  useEffect(() => {
    void setQuranViewMode(viewMode);
  }, [viewMode]);

  // Fetch transliteration+translation when Detailed view is active
  useEffect(() => {
    if (viewMode !== 'detailed') return;
    if (translations.length > 0) return;
    getSurahTranslation(surahNum).then(setTranslations);
  }, [viewMode, surahNum, translations.length]);

  useEffect(() => {
    getBookmark().then((bm: Bookmark | null) => {
      if (bm?.surahNumber === surahNum) {
        setBookmarkedAyah(bm.ayahNumber);
        setBookmarkScrollY(bm.scrollY);
        setBookmarkFontSizeIdx(bm.fontSizeIdx);
      }
    });
  }, [surahNum]);

  useEffect(
    () => () => {
      void soundRef.current?.unloadAsync();
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      void setLastPosition(surahNum, currentAyahRef.current);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setLoadingAyah(null);
  }, []);

  const handlePlayAyah = useCallback(
    async (ayahNumber: number) => {
      if (IS_EXPO_GO) {
        Alert.alert(
          'Audio not available in Expo Go',
          'Audio playback requires a development build and will work once the app is built natively.',
        );
        return;
      }
      if (playingAyah === ayahNumber) {
        await stopAndUnload();
        return;
      }
      await stopAndUnload();
      setLoadingAyah(ayahNumber);
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { Audio } = require('expo-av') as typeof import('expo-av');
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
        const url = getAyahAudioUrl(surahNum, ayahNumber, reciterId);
        const { sound } = await Audio.Sound.createAsync(
          { uri: url },
          { shouldPlay: true },
          (status) => {
            if (status.isLoaded && status.didJustFinish) {
              setPlayingAyah(null);
              setLoadingAyah(null);
              soundRef.current = null;
            }
          },
        );
        soundRef.current = sound;
        setLoadingAyah(null);
        setPlayingAyah(ayahNumber);
      } catch {
        setLoadingAyah(null);
        setPlayingAyah(null);
        Alert.alert('Audio Unavailable', 'Could not load audio for this verse.');
      }
    },
    [playingAyah, surahNum, reciterId, stopAndUnload],
  );

  const handleBookmarkAyah = useCallback(
    (ayahNumber: number) => {
      if (bookmarkedAyah === ayahNumber) {
        Alert.alert('Remove Bookmark', 'Remove bookmark from this verse?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Remove', style: 'destructive', onPress: () => setBookmarkedAyah(null) },
        ]);
      } else {
        setBookmarkedAyah(ayahNumber);
        void setBookmark(
          surahNum,
          ayahNumber,
          viewMode === 'page' ? pageScrollYRef.current : undefined,
          fontSizeIdx,
        );
        Alert.alert(
          'Bookmark Saved',
          `Verse ${ayahNumber} of ${surah?.englishName ?? 'this surah'} bookmarked.`,
        );
      }
    },
    [bookmarkedAyah, surahNum, surah, viewMode, fontSizeIdx],
  );

  // Page view: tap verse marker → play + show active verse panel
  const handleVerseMarkerPress = useCallback(
    (ayahNumber: number) => {
      void handlePlayAyah(ayahNumber);
      setActiveVerse(ayahNumber);
    },
    [handlePlayAyah],
  );

  // Scroll to a verse in either view mode.
  // Detailed: index-based scrollToIndex (always accurate).
  // Page: uses stored exact scrollY if jumping to the bookmarked verse; otherwise estimates.
  const scrollToVerse = useCallback((ayahNumber: number, animated = true) => {
    if (viewMode === 'detailed' && listRef.current) {
      // Index-based scroll stays correct no matter when the bookmark was saved.
      setTimeout(() => {
        listRef.current?.scrollToIndex({
          index: ayahNumber - 1,
          animated: true,
          viewPosition: 0.3,
        });
      }, 800);
    } else if (pageScrollRef.current && surah) {
      if (ayahNumber === bookmarkedAyah && bookmarkScrollY !== undefined) {
        if (bookmarkFontSizeIdx !== undefined && bookmarkFontSizeIdx !== fontSizeIdx) {
          setFontSizeIdx(bookmarkFontSizeIdx);
          setTimeout(() => {
            pageScrollRef.current?.scrollTo({ y: bookmarkScrollY, animated });
          }, 350);
        } else {
          pageScrollRef.current.scrollTo({ y: bookmarkScrollY, animated });
        }
      } else {
        const showBismillah = surahNum !== 1 && surahNum !== 9;
        const bismillahOffset = showBismillah ? fontSize * 0.9 + 24 : 0;
        const cardPadding = 36;
        const verseOffset = estimateVerseOffset(surah.ayahs, ayahNumber, fontSize, cardWidth);
        pageScrollRef.current.scrollTo({ y: bismillahOffset + cardPadding + verseOffset, animated });
      }
    }
  }, [viewMode, surah, surahNum, fontSize, cardWidth, bookmarkedAyah, bookmarkScrollY, bookmarkFontSizeIdx, fontSizeIdx]);

  const handleViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (!viewableItems.length) return;
      const firstAyah = viewableItems[0].item as Ayah;
      currentAyahRef.current = firstAyah.numberInSurah;
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
  // Defensive: strip Bismillah from verse 1 text if the data includes it as a prefix
  const firstAyahRaw = surah.ayahs[0].text;
  const startsWithBismillah = showBasmalah && firstAyahRaw.startsWith(basmalah.slice(0, 10));
  const firstAyahText = startsWithBismillah ? firstAyahRaw.slice(basmalah.length).trim() : firstAyahRaw;

  return (
    <View style={{ flex: 1, backgroundColor: 'white' }} {...panResponder.panHandlers}>
      {/* ── Fixed header ── */}
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
          <TouchableOpacity onPress={() => router.replace('/')} style={{ padding: 6 }}>
            <Ionicons name="home-outline" size={20} color="#0F766E" />
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

        {/* View mode toggle + EN toggle (EN applies to Page view; Detailed always shows translation) */}
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

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {bookmarkedAyah !== null && (
              <TouchableOpacity
                onPress={() => scrollToVerse(bookmarkedAyah, true)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#C0392B',
                  borderRadius: 6,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  gap: 4,
                }}
              >
                <Text style={{ fontFamily: 'KFGQPCHafs', fontSize: 14, color: 'white' }}>
                  {'۝'}
                </Text>
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: 'white' }}>
                  Bookmark {bookmarkedAyah}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* ── Surah banner ── */}
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
      </View>



      {/* ── Page view: flowing Mushaf ── */}
      {viewMode === 'page' ? (
        <ScrollView
          ref={pageScrollRef}
          onScroll={(e) => { pageScrollYRef.current = e.nativeEvent.contentOffset.y; }}
          scrollEventThrottle={100}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        >
          {/* Bismillah header above the parchment (not shown for surah 1 or 9) */}
          {showBasmalah && (
            <Text
              style={{
                fontFamily: 'KFGQPCHafs',
                fontSize: fontSize * 0.9,
                color: '#0F766E',
                textAlign: 'center',
                marginHorizontal: 16,
                marginTop: 16,
                marginBottom: 8,
              }}
            >
              {basmalah}
            </Text>
          )}

          {/* Parchment card */}
          <View
            style={{
              backgroundColor: '#F5F0E8',
              borderRadius: 12,
              margin: 16,
              marginTop: showBasmalah ? 0 : 16,
              padding: 20,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            {/* One continuous Text block — all ayahs inline with ornamental verse markers */}
            <Text
              style={{
                writingDirection: 'rtl',
                textAlign: 'justify',
                fontFamily: 'KFGQPCHafs',
                fontSize,
                lineHeight: fontSize * 2,
                color: '#1a1a1a',
              }}
            >
              {surah.ayahs.map((ayah) => {
                const isPlaying = playingAyah === ayah.numberInSurah;
                const isLoading = loadingAyah === ayah.numberInSurah;
                const isBookmarked = bookmarkedAyah === ayah.numberInSurah;
                const textContent =
                  ayah.numberInSurah === 1 && startsWithBismillah ? firstAyahText : ayah.text;
                const markerContent = isLoading
                  ? '○'
                  : isPlaying
                  ? '⏸'
                  : isBookmarked
                  ? `۞ ${ayah.numberInSurah}`
                  : `۝ ${ayah.numberInSurah}`;
                const markerColor = isLoading
                  ? '#9CA3AF'
                  : isPlaying
                  ? '#0D9488'
                  : isBookmarked
                  ? '#C0392B'
                  : '#0F766E';
                return (
                  <Text key={ayah.numberInSurah}>
                    <Text style={{ fontFamily: 'KFGQPCHafs', fontSize }}>{textContent}{' '}</Text>
                    <Text
                      onPress={() => handleVerseMarkerPress(ayah.numberInSurah)}
                      onLongPress={() => handleBookmarkAyah(ayah.numberInSurah)}
                      style={{
                        fontFamily: 'KFGQPCHafs',
                        fontSize: isBookmarked ? fontSize * 1.0 : fontSize * 0.85,
                        color: markerColor,
                      }}
                    >
                      {markerContent}{' '}
                    </Text>
                  </Text>
                );
              })}
            </Text>
          </View>

          {/* Active verse panel — shown when a verse marker is tapped */}
          {activeVerse !== null && (
            <View
              style={{
                backgroundColor: 'white',
                borderRadius: 16,
                marginHorizontal: 16,
                marginBottom: 16,
                padding: 16,
                borderWidth: 1,
                borderColor: '#F3F4F6',
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#111827' }}
                >
                  {surah.englishName} : {activeVerse}
                </Text>
                <TouchableOpacity onPress={() => setActiveVerse(null)} style={{ padding: 4 }}>
                  <Ionicons name="close" size={18} color="#6B7280" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      ) : (
        /* ── Detailed view: card per ayah ── */
        <FlatList
          ref={listRef}
          data={surah.ayahs}
          keyExtractor={(ayah) => String(ayah.numberInSurah)}
          onViewableItemsChanged={handleViewableItemsChanged}
          viewabilityConfig={viewabilityConfig.current}
          contentContainerStyle={{ paddingVertical: 8, paddingBottom: insets.bottom + 24 }}
          onScrollToIndexFailed={(info) => {
            const offset = (info.averageItemLength ?? 200) * info.index;
            listRef.current?.scrollToOffset({ offset, animated: true });
          }}
          renderItem={({ item: ayah }) => {
            const t = translations.find((x) => x.numberInSurah === ayah.numberInSurah);
            const isPlaying = playingAyah === ayah.numberInSurah;
            const isLoading = loadingAyah === ayah.numberInSurah;
            const isBookmarked = bookmarkedAyah === ayah.numberInSurah;

            return (
              <View
                onLayout={(e) => {
                  itemHeightsRef.current[ayah.numberInSurah] = e.nativeEvent.layout.height;
                }}
                style={{
                  flexDirection: 'row',
                  marginHorizontal: 16,
                  marginBottom: 12,
                  borderRadius: 16,
                  backgroundColor: 'white',
                  borderWidth: 1,
                  borderColor: isBookmarked ? '#0F766E' : '#F3F4F6',
                  padding: 16,
                }}
              >
                {/* Left column */}
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontFamily: 'KFGQPCHafs',
                      fontSize,
                      textAlign: 'right',
                      writingDirection: 'rtl',
                      lineHeight: fontSize * 1.8,
                      color: '#111827',
                      marginBottom: 12,
                    }}
                  >
                    {ayah.text}
                  </Text>

                  {!!t?.transliteration && (
                    <Text
                      style={{
                        fontFamily: 'Inter_400Regular',
                        fontSize: 13,
                        color: '#6B7280',
                        fontStyle: 'italic',
                        marginBottom: 8,
                        lineHeight: 20,
                      }}
                    >
                      {t.transliteration}
                    </Text>
                  )}

                  {!!t?.translation && (
                    <Text
                      style={{
                        fontFamily: 'Inter_400Regular',
                        fontSize: 15,
                        color: '#111827',
                        marginBottom: 14,
                        lineHeight: 22,
                      }}
                    >
                      {t.translation}
                    </Text>
                  )}

                  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    {/* Play button */}
                    <TouchableOpacity
                      onPress={() => void handlePlayAyah(ayah.numberInSurah)}
                      disabled={isLoading}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: isPlaying ? '#0F766E' : '#D1D5DB',
                        backgroundColor: isPlaying ? '#0F766E' : 'white',
                        marginRight: 8,
                        marginBottom: 4,
                      }}
                    >
                      {isLoading ? (
                        <ActivityIndicator
                          size="small"
                          color="#6B7280"
                          style={{ marginRight: 6 }}
                        />
                      ) : (
                        <Ionicons
                          name={isPlaying ? 'pause' : 'play'}
                          size={14}
                          color={isPlaying ? 'white' : '#374151'}
                          style={{ marginRight: 6 }}
                        />
                      )}
                      <Text
                        style={{
                          fontFamily: 'Inter_500Medium',
                          fontSize: 13,
                          color: isPlaying ? 'white' : '#374151',
                        }}
                      >
                        {isLoading ? 'Loading...' : isPlaying ? 'Pause' : 'Play Recitation'}
                      </Text>
                    </TouchableOpacity>

                    {/* Bookmark button */}
                    <TouchableOpacity
                      onPress={() => handleBookmarkAyah(ayah.numberInSurah)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: isBookmarked ? '#0F766E' : '#D1D5DB',
                        backgroundColor: isBookmarked ? '#0F766E' : 'white',
                        marginBottom: 4,
                      }}
                    >
                      <Ionicons
                        name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
                        size={14}
                        color={isBookmarked ? 'white' : '#374151'}
                        style={{ marginRight: 6 }}
                      />
                      <Text
                        style={{
                          fontFamily: 'Inter_500Medium',
                          fontSize: 13,
                          color: isBookmarked ? 'white' : '#374151',
                        }}
                      >
                        {isBookmarked ? 'Bookmarked' : 'Bookmark'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Right column — verse number badge */}
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: '#0F766E',
                    backgroundColor: isBookmarked ? '#0F766E' : 'white',
                    alignItems: 'center',
                    justifyContent: 'center',
                    alignSelf: 'flex-start',
                    marginLeft: 12,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: 'Inter_700Bold',
                      fontSize: 11,
                      color: isBookmarked ? 'white' : '#0F766E',
                    }}
                  >
                    {ayah.numberInSurah}
                  </Text>
                </View>
              </View>
            );
          }}
        />
      )}

    </View>
  );
}
