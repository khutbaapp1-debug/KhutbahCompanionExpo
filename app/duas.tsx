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

const BASE_URL = 'https://khutbah-translate.replit.app';
const DUA_CACHE_KEY = 'duas-cache-v1';

type Dua = {
  id: string;
  category: string;
  occasion: string | null;
  arabicText: string;
  transliteration: string;
  translation: string;
  reference: string | null;
};

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
  const [duas, setDuas] = useState<Dua[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  const filtered = useMemo(
    () => (category === 'all' ? duas : duas.filter((d) => d.category === category)),
    [duas, category],
  );

  const copyDua = async (dua: Dua) => {
    const text = `${dua.translation}\n\n${dua.transliteration}${dua.reference ? `\n— ${dua.reference}` : ''}`;
    await Clipboard.setStringAsync(text);
    setCopiedId(dua.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Daily Duas' }} />
      <View style={{ flex: 1, backgroundColor: 'white' }}>
        {/* Category chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ borderBottomWidth: 1, borderBottomColor: '#F3F4F6', height: 44 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10 }}
        >
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              onPress={() => setCategory(cat.id)}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                marginRight: 8,
                alignSelf: 'center',
                backgroundColor: category === cat.id ? '#0F766E' : '#F3F4F6',
              }}
            >
              <Text
                numberOfLines={1}
                style={{
                  fontFamily: 'Inter_500Medium',
                  fontSize: 13,
                  color: category === cat.id ? 'white' : '#374151',
                }}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color="#0F766E" />
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
                  style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: '#9CA3AF' }}
                >
                  No duas found
                </Text>
              </View>
            }
            renderItem={({ item: dua }) => (
              <View
                style={{
                  backgroundColor: 'white',
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
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
                        backgroundColor: '#F0FDFA',
                        borderRadius: 6,
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: 'Inter_500Medium',
                          fontSize: 11,
                          color: '#0F766E',
                        }}
                      >
                        {dua.occasion ?? dua.category}
                      </Text>
                    </View>
                    {dua.reference && (
                      <View
                        style={{
                          backgroundColor: '#F9FAFB',
                          borderRadius: 6,
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderWidth: 1,
                          borderColor: '#E5E7EB',
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: 'Inter_400Regular',
                            fontSize: 11,
                            color: '#6B7280',
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
                      color={copiedId === dua.id ? '#0F766E' : '#9CA3AF'}
                    />
                  </TouchableOpacity>
                </View>

                {/* Arabic */}
                <Text
                  style={{
                    fontFamily: 'KFGQPCHafs',
                    fontSize: 22,
                    color: '#111827',
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
                    color: '#6B7280',
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
                    color: '#374151',
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
    </>
  );
}
