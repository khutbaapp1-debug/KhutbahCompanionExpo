import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../src/lib/theme-context';
import { usePremium } from '../src/hooks/usePremium';
import { PremiumPaywall } from '../src/components/PremiumPaywall';

const BASE_URL = 'https://khutbahtranslate-production.up.railway.app';
const DUA_CACHE_KEY = 'duas-cache-v2';

type Dua = {
  id: string;
  category: string;
  occasion: string | null;
  arabicText: string;
  transliteration: string;
  translation: string;
  reference: string | null;
};

const FREE_CATEGORY_IDS = ['all', 'morning', 'evening', 'daily', 'food', 'protection', 'family'];

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'morning', label: 'Morning' },
  { id: 'evening', label: 'Evening' },
  { id: 'daily', label: 'Daily' },
  { id: 'sleep', label: 'Sleep' },
  { id: 'travel', label: 'Travel' },
  { id: 'food', label: 'Food' },
  { id: 'prayer', label: 'Prayer' },
  { id: 'distress', label: 'Distress' },
  { id: 'forgiveness', label: 'Forgiveness' },
  { id: 'knowledge', label: 'Knowledge' },
  { id: 'protection', label: 'Protection' },
  { id: 'health', label: 'Health' },
  { id: 'family', label: 'Family' },
  { id: 'provision', label: 'Provision' },
  { id: 'mosque', label: 'Mosque' },
  { id: 'weather', label: 'Weather' },
];

export default function DuasScreen() {
  const insets = useSafeAreaInsets();
  const { theme, mode } = useTheme();
  const { isPremium } = usePremium();
  const [duas, setDuas] = useState<Dua[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    async function load() {
      try {
        const cached = await AsyncStorage.getItem(DUA_CACHE_KEY);
        if (cancelled) return;
        if (cached) {
          setDuas(JSON.parse(cached) as Dua[]);
          setLoading(false);
        }
      } catch {}

      try {
        const res = await fetch(`${BASE_URL}/api/duas`, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as Dua[];
        if (cancelled) return;
        if (Array.isArray(data)) {
          setDuas(data);
          void AsyncStorage.setItem(DUA_CACHE_KEY, JSON.stringify(data));
        }
      } catch {}
      if (cancelled) return;
      setLoading(false);
    }
    void load();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  const filtered = useMemo(() => {
    return category === 'all' ? duas : duas.filter((d) => d.category === category);
  }, [duas, category]);

  // Build a per-category index so we know whether a card is the first in its
  // category within the currently filtered list (index 0 = first = never blurred).
  const categoryIndexMap = useMemo(() => {
    const counts: Record<string, number> = {};
    return filtered.map((dua) => {
      const current = counts[dua.category] ?? 0;
      counts[dua.category] = current + 1;
      return current;
    });
  }, [filtered]);

  const copyDua = async (dua: Dua) => {
    const text = `${dua.translation}\n\n${dua.transliteration}${dua.reference ? `\n— ${dua.reference}` : ''}`;
    await Clipboard.setStringAsync(text);
    setCopiedId(dua.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const overlayBg = mode === 'dark' ? 'rgba(0,0,0,0.75)' : 'rgba(255,255,255,0.85)';

  return (
    <>
      <Stack.Screen options={{ title: 'Daily Duas' }} />
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        {/* Category chips — all categories shown, no lock icon */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ borderBottomWidth: 1, borderBottomColor: theme.border, flexGrow: 0 }}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingRight: 24,
            paddingVertical: 8,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              onPress={() => setCategory(cat.id)}
              style={{
                paddingHorizontal: 12,
                paddingTop: 8,
                paddingBottom: 10,
                borderRadius: 20,
                marginRight: 8,
                alignSelf: 'center',
                minHeight: 44,
                justifyContent: 'center',
                backgroundColor: category === cat.id ? theme.primary : theme.surface,
              }}
            >
              <Text
                style={{
                  fontFamily: 'Inter_500Medium',
                  fontSize: 12,
                  lineHeight: 12 * 1.6,
                  includeFontPadding: false,
                  paddingBottom: 8,
                  color: category === cat.id ? '#FFFFFF' : theme.textSecondary,
                }}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{
              padding: 16,
              gap: 12,
              paddingBottom: insets.bottom + 16,
            }}
            ListEmptyComponent={
              <View style={{ padding: 40, alignItems: 'center' }}>
                <Text
                  style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: theme.textMuted }}
                >
                  No duas found
                </Text>
              </View>
            }
            renderItem={({ item: dua, index }) => {
              const isFreeCategory = FREE_CATEGORY_IDS.includes(dua.category);
              const indexInCat = categoryIndexMap[index] ?? 0;
              // Blur if premium category AND not the first card in that category
              const shouldBlur = !isPremium && !isFreeCategory && indexInCat > 0;

              const cardContent = (
                <View
                  style={{
                    backgroundColor: theme.card,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: theme.border,
                  }}
                >
                  {/* Card header: badges + copy button */}
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      paddingHorizontal: 16,
                      paddingTop: 12,
                      paddingBottom: 8,
                    }}
                  >
                    <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', flex: 1 }}>
                      <View
                        style={{
                          backgroundColor: theme.primaryContainer,
                          borderRadius: 6,
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: 'Inter_500Medium',
                            fontSize: 11,
                            color: theme.primary,
                          }}
                        >
                          {dua.occasion ?? dua.category}
                        </Text>
                      </View>
                      {dua.reference && (
                        <View
                          style={{
                            backgroundColor: theme.surface,
                            borderRadius: 6,
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderWidth: 1,
                            borderColor: theme.border,
                          }}
                        >
                          <Text
                            style={{
                              fontFamily: 'Inter_400Regular',
                              fontSize: 11,
                              color: theme.textMuted,
                            }}
                          >
                            {dua.reference}
                          </Text>
                        </View>
                      )}
                    </View>
                    <TouchableOpacity onPress={() => void copyDua(dua)} style={{ padding: 4 }}>
                      <Ionicons
                        name={copiedId === dua.id ? 'checkmark-circle' : 'copy-outline'}
                        size={20}
                        color={copiedId === dua.id ? theme.primary : theme.textMuted}
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Arabic */}
                  <Text
                    style={{
                      fontFamily: 'NotoNaskhArabic_400Regular',
                      fontSize: 22,
                      color: theme.text,
                      lineHeight: 44,
                      textAlign: 'right',
                      paddingHorizontal: 16,
                      paddingBottom: 8,
                    }}
                  >
                    {dua.arabicText}
                  </Text>

                  {/* Transliteration */}
                  <Text
                    style={{
                      fontFamily: 'Inter_400Regular',
                      fontSize: 13,
                      color: theme.textMuted,
                      fontStyle: 'italic',
                      paddingHorizontal: 16,
                      paddingBottom: 8,
                    }}
                  >
                    {dua.transliteration}
                  </Text>

                  {/* Translation */}
                  <Text
                    style={{
                      fontFamily: 'Inter_400Regular',
                      fontSize: 14,
                      color: theme.textSecondary,
                      lineHeight: 22,
                      paddingHorizontal: 16,
                      paddingBottom: 16,
                    }}
                  >
                    {dua.translation}
                  </Text>
                </View>
              );

              if (shouldBlur) {
                return (
                  <View style={{ position: 'relative' }}>
                    {cardContent}
                    <TouchableOpacity
                      activeOpacity={0.9}
                      onPress={() => setShowPaywall(true)}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: overlayBg,
                        borderRadius: 12,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons name="lock-closed" size={24} color={theme.primary} />
                      <Text
                        style={{
                          fontFamily: 'Inter_600SemiBold',
                          fontSize: 14,
                          color: theme.primary,
                          marginTop: 6,
                        }}
                      >
                        Premium
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              }

              return cardContent;
            }}
          />
        )}
      </View>
      <PremiumPaywall visible={showPaywall} onDismiss={() => setShowPaywall(false)} />
    </>
  );
}
