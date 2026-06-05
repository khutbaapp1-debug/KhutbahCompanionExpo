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

const FREE_CATEGORY_IDS = ['all', 'morning', 'evening'];

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
  const { theme } = useTheme();
  const { isPremium } = usePremium();
  const [duas, setDuas] = useState<Dua[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const cached = await AsyncStorage.getItem(DUA_CACHE_KEY);
        if (cached) {
          setDuas(JSON.parse(cached) as Dua[]);
          setLoading(false);
        }
      } catch {}

      try {
        const res = await fetch(`${BASE_URL}/api/duas`);
        const data = (await res.json()) as Dua[];
        if (Array.isArray(data)) {
          setDuas(data);
          void AsyncStorage.setItem(DUA_CACHE_KEY, JSON.stringify(data));
        }
      } catch {}
      setLoading(false);
    }
    void load();
  }, []);

  const filtered = useMemo(() => {
    if (!isPremium && category === 'all') {
      return duas.filter((d) => d.category === 'morning' || d.category === 'evening');
    }
    return category === 'all' ? duas : duas.filter((d) => d.category === category);
  }, [duas, category, isPremium]);

  const copyDua = async (dua: Dua) => {
    const text = `${dua.translation}\n\n${dua.transliteration}${dua.reference ? `\n— ${dua.reference}` : ''}`;
    await Clipboard.setStringAsync(text);
    setCopiedId(dua.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Daily Duas' }} />
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        {/* Category chips */}
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
          {CATEGORIES.map((cat) => {
            const isLocked = !isPremium && !FREE_CATEGORY_IDS.includes(cat.id);
            return (
              <TouchableOpacity
                key={cat.id}
                onPress={() => {
                if (isLocked) {
                  setShowPaywall(true);
                } else {
                  setCategory(cat.id);
                }
              }}
                style={{
                  paddingHorizontal: 16,
                  paddingTop: 8,
                  paddingBottom: 10,
                  borderRadius: 20,
                  marginRight: 8,
                  alignSelf: 'center',
                  backgroundColor: category === cat.id ? theme.primary : theme.surface,
                }}
              >
                <Text
                  numberOfLines={1}
                  style={{
                    fontFamily: 'Inter_500Medium',
                    fontSize: 13,
                    lineHeight: 20,
                    includeFontPadding: false,
                    color: category === cat.id ? '#FFFFFF' : theme.textSecondary,
                  }}
                >
                  {cat.label}{isLocked ? ' 🔒' : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        ) : !isPremium && !FREE_CATEGORY_IDS.includes(category) ? (
          <TouchableOpacity
            onPress={() => setShowPaywall(true)}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}
            activeOpacity={0.8}
          >
            <Ionicons name="lock-closed" size={48} color={theme.textMuted} />
            <Text
              style={{
                fontFamily: 'Inter_600SemiBold',
                fontSize: 17,
                color: theme.text,
                textAlign: 'center',
                marginTop: 16,
                marginBottom: 8,
              }}
            >
              Premium Category
            </Text>
            <Text
              style={{
                fontFamily: 'Inter_400Regular',
                fontSize: 14,
                color: theme.textMuted,
                textAlign: 'center',
                lineHeight: 22,
              }}
            >
              Tap to upgrade to Premium
            </Text>
          </TouchableOpacity>
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
            renderItem={({ item: dua }) => (
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
                    fontFamily: 'KFGQPCHafs',
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
            )}
          />
        )}
      </View>
        <PremiumPaywall visible={showPaywall} onDismiss={() => setShowPaywall(false)} />
    </>
  );
}
