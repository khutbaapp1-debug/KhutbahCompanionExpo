import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Share,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BASE_URL = 'https://khutbah-translate.replit.app';

type Hadith = {
  id: string;
  arabicText: string;
  englishTranslation: string;
  narrator: string;
  collection: string;
  reference: string;
  grade?: string | null;
};

function todayKey(): string {
  const d = new Date();
  return `hadith-cache-${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export default function HadithScreen() {
  const insets = useSafeAreaInsets();
  const [hadith, setHadith] = useState<Hadith | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function load() {
      const key = todayKey();
      try {
        const cached = await AsyncStorage.getItem(key);
        if (cached) {
          setHadith(JSON.parse(cached) as Hadith);
          setLoading(false);
          return;
        }
      } catch {}

      try {
        const res = await fetch(`${BASE_URL}/api/hadiths/daily`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as Hadith;
        setHadith(data);
        void AsyncStorage.setItem(key, JSON.stringify(data));
      } catch {
        setError(true);
      }
      setLoading(false);
    }
    void load();
  }, []);

  const shareHadith = async () => {
    if (!hadith) return;
    await Share.share({
      message: `${hadith.englishTranslation}\n\n— ${hadith.narrator}, ${hadith.reference}`,
    });
  };

  const dateLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Daily Hadith',
          headerRight: () =>
            hadith ? (
              <TouchableOpacity onPress={() => void shareHadith()} style={{ marginRight: 4 }}>
                <Ionicons name="share-outline" size={22} color="#0F766E" />
              </TouchableOpacity>
            ) : null,
        }}
      />
      <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color="#0F766E" />
          </View>
        ) : error || !hadith ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
            <Ionicons name="cloud-offline-outline" size={48} color="#D1D5DB" />
            <Text
              style={{
                fontFamily: 'Inter_400Regular',
                fontSize: 15,
                color: '#9CA3AF',
                marginTop: 12,
                textAlign: 'center',
              }}
            >
              Unable to load today's hadith.{'\n'}Please check your connection.
            </Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
          >
            {/* Date chip */}
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <View
                style={{
                  backgroundColor: '#F0FDFA',
                  borderRadius: 20,
                  paddingHorizontal: 14,
                  paddingVertical: 5,
                  borderWidth: 1,
                  borderColor: '#99F6E4',
                }}
              >
                <Text
                  style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: '#0F766E' }}
                >
                  {dateLabel}
                </Text>
              </View>
            </View>

            {/* Card */}
            <View
              style={{
                backgroundColor: 'white',
                borderRadius: 16,
                borderWidth: 1,
                borderColor: '#E5E7EB',
                overflow: 'hidden',
              }}
            >
              {/* Teal top accent */}
              <View style={{ height: 4, backgroundColor: '#0F766E' }} />

              {/* Arabic */}
              <View
                style={{
                  padding: 20,
                  borderBottomWidth: 1,
                  borderBottomColor: '#F3F4F6',
                  backgroundColor: '#FAFFFE',
                }}
              >
                <Text
                  style={{
                    fontFamily: 'KFGQPCHafs',
                    fontSize: 22,
                    color: '#111827',
                    lineHeight: 44,
                    textAlign: 'right',
                  }}
                >
                  {hadith.arabicText}
                </Text>
              </View>

              {/* Translation */}
              <View style={{ padding: 20, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
                <Text
                  style={{
                    fontFamily: 'Inter_400Regular',
                    fontSize: 16,
                    color: '#111827',
                    lineHeight: 26,
                  }}
                >
                  {hadith.englishTranslation}
                </Text>
              </View>

              {/* Footer: narrator + source */}
              <View style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <View
                  style={{
                    backgroundColor: '#F3F4F6',
                    borderRadius: 6,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                  }}
                >
                  <Text
                    style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: '#374151' }}
                  >
                    {hadith.narrator}
                  </Text>
                </View>
                <View
                  style={{
                    backgroundColor: '#F0FDFA',
                    borderRadius: 6,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                  }}
                >
                  <Text
                    style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: '#0F766E' }}
                  >
                    {hadith.reference}
                  </Text>
                </View>
                {hadith.grade && (
                  <View
                    style={{
                      backgroundColor: '#ECFDF5',
                      borderRadius: 6,
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                    }}
                  >
                    <Text
                      style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: '#059669' }}
                    >
                      {hadith.grade}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Share button */}
            <TouchableOpacity
              onPress={() => void shareHadith()}
              style={{
                marginTop: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                backgroundColor: '#0F766E',
                borderRadius: 12,
                paddingVertical: 14,
              }}
            >
              <Ionicons name="share-outline" size={18} color="white" />
              <Text
                style={{ fontFamily: 'Inter_600SemiBold', fontSize: 15, color: 'white' }}
              >
                Share Hadith
              </Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>
    </>
  );
}
