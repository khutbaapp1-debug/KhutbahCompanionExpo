import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import QuickTourModal from '../../src/components/quran/QuickTourModal';
import { getSurahList } from '../../src/lib/quran';
import { getLastSurah } from '../../src/lib/quran-bookmark';

const TOUR_KEY = 'quran-tour-seen';

export default function QuranListScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [tourVisible, setTourVisible] = useState(false);
  const [lastSurah, setLastSurah] = useState<
    ReturnType<typeof getSurahList>[number] | null
  >(null);

  const surahs = useMemo(() => getSurahList(), []);

  useEffect(() => {
    AsyncStorage.getItem(TOUR_KEY).then((seen) => {
      if (!seen) setTourVisible(true);
    });
  }, []);

  // Load the last-read surah so the Continue Reading card can offer to resume.
  useEffect(() => {
    getLastSurah().then((num) => {
      if (!num) return;
      const found = getSurahList().find((s) => s.number === num);
      if (found) setLastSurah(found);
    });
  }, []);

  const dismissTour = () => {
    setTourVisible(false);
    AsyncStorage.setItem(TOUR_KEY, '1');
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return surahs;
    const n = parseInt(q, 10);
    return surahs.filter(
      (s) =>
        s.englishName.toLowerCase().includes(q) ||
        s.englishNameTranslation.toLowerCase().includes(q) ||
        (!Number.isNaN(n) && s.number === n),
    );
  }, [query, surahs]);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'The Holy Qur’an',
          headerRight: () => (
            <TouchableOpacity onPress={() => setTourVisible(true)} style={{ marginRight: 4 }}>
              <Ionicons name="help-circle-outline" size={24} color="#0F766E" />
            </TouchableOpacity>
          ),
        }}
      />

      <View style={{ flex: 1, backgroundColor: 'white' }}>
        {/* Search bar */}
        <View
          style={{
            paddingHorizontal: 16,
            paddingVertical: 10,
            backgroundColor: 'white',
            borderBottomWidth: 1,
            borderBottomColor: '#F3F4F6',
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#F9FAFB',
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 8,
            }}
          >
            <Ionicons name="search-outline" size={18} color="#9CA3AF" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search by name or number…"
              placeholderTextColor="#9CA3AF"
              style={{
                flex: 1,
                marginLeft: 8,
                fontFamily: 'Inter_400Regular',
                fontSize: 14,
                color: '#111827',
              }}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')}>
                <Ionicons name="close-circle" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {lastSurah && (
          <TouchableOpacity
            onPress={() => router.push(`/quran/${lastSurah.number}`)}
            style={{
              backgroundColor: '#0F766E',
              marginHorizontal: 16,
              marginTop: 12,
              marginBottom: 4,
              borderRadius: 12,
              padding: 14,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 13, color: 'white' }}>
                  {lastSurah.number}
                </Text>
              </View>
              <View>
                <Text
                  style={{
                    fontFamily: 'Inter_400Regular',
                    fontSize: 11,
                    color: 'rgba(255,255,255,0.8)',
                  }}
                >
                  Continue Reading
                </Text>
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 15, color: 'white' }}>
                  {lastSurah.englishName}
                </Text>
                <Text
                  style={{
                    fontFamily: 'Inter_400Regular',
                    fontSize: 11,
                    color: 'rgba(255,255,255,0.8)',
                    marginTop: 1,
                  }}
                >
                  {lastSurah.englishNameTranslation} · {lastSurah.numberOfAyahs} verses
                </Text>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <Text style={{ fontFamily: 'KFGQPCHafs', fontSize: 16, color: 'white' }}>
                {lastSurah.name}
              </Text>
              <Ionicons
                name="chevron-forward-circle-outline"
                size={20}
                color="rgba(255,255,255,0.8)"
              />
            </View>
          </TouchableOpacity>
        )}

        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.number)}
          contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => router.push(`/quran/${item.number}`)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderBottomWidth: 1,
                borderBottomColor: '#F3F4F6',
              }}
            >
              {/* Number badge */}
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: '#F0FDFA',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 14,
                  flexShrink: 0,
                }}
              >
                <Text
                  style={{ fontFamily: 'Inter_700Bold', fontSize: 12, color: '#0F766E' }}
                >
                  {item.number}
                </Text>
              </View>

              {/* English info */}
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                  <Text
                    style={{
                      fontFamily: 'Inter_600SemiBold',
                      fontSize: 15,
                      color: '#111827',
                      marginRight: 6,
                    }}
                  >
                    {item.englishName}
                  </Text>
                  <View
                    style={{
                      backgroundColor: item.revelationType === 'Meccan' ? '#FEF3C7' : '#EDE9FE',
                      borderRadius: 4,
                      paddingHorizontal: 5,
                      paddingVertical: 1,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: 'Inter_400Regular',
                        fontSize: 10,
                        color: item.revelationType === 'Meccan' ? '#92400E' : '#5B21B6',
                      }}
                    >
                      {item.revelationType}
                    </Text>
                  </View>
                </View>
                <Text
                  style={{
                    fontFamily: 'Inter_400Regular',
                    fontSize: 12,
                    color: '#6B7280',
                    marginTop: 2,
                  }}
                >
                  {item.englishNameTranslation} · {item.numberOfAyahs} verses
                </Text>
              </View>

              {/* Arabic name */}
              <Text
                style={{
                  fontFamily: 'KFGQPCHafs',
                  fontSize: 18,
                  color: '#0F766E',
                  marginLeft: 10,
                  flexShrink: 0,
                }}
              >
                {item.name}
              </Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: '#9CA3AF' }}>
                No surahs match &quot;{query}&quot;
              </Text>
            </View>
          }
        />
      </View>

      <QuickTourModal visible={tourVisible} onDismiss={dismissTour} />
    </>
  );
}
