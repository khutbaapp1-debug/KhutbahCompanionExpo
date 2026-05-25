import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { namesOfAllah } from '../src/data/names-of-allah';

export default function NamesScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const listRef = useRef<FlatList>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return namesOfAllah;
    return namesOfAllah.filter(
      (n) =>
        n.transliteration.toLowerCase().includes(q) ||
        n.meaning.toLowerCase().includes(q) ||
        n.arabic.includes(q),
    );
  }, [query]);

  return (
    <>
      <Stack.Screen options={{ title: '99 Names of Allah' }} />
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
              placeholder="Search by name or meaning…"
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

        <FlatList
          ref={listRef}
          data={filtered}
          keyExtractor={(item) => String(item.number)}
          contentContainerStyle={{ paddingVertical: 8, paddingBottom: insets.bottom + 16 }}
          renderItem={({ item: name }) => (
            <View
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
                  {name.number}
                </Text>
              </View>

              {/* Name info */}
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontFamily: 'Inter_600SemiBold',
                    fontSize: 15,
                    color: '#111827',
                  }}
                >
                  {name.transliteration}
                </Text>
                <Text
                  style={{
                    fontFamily: 'Inter_400Regular',
                    fontSize: 13,
                    color: '#6B7280',
                    marginTop: 2,
                  }}
                >
                  {name.meaning}
                </Text>
              </View>

              {/* Arabic */}
              <Text
                style={{
                  fontFamily: 'KFGQPCHafs',
                  fontSize: 20,
                  color: '#0F766E',
                  marginLeft: 10,
                  flexShrink: 0,
                  lineHeight: 36,
                }}
              >
                {name.arabic}
              </Text>
            </View>
          )}
          ListEmptyComponent={
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Text
                style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: '#9CA3AF' }}
              >
                No names match &quot;{query}&quot;
              </Text>
            </View>
          }
        />
      </View>
    </>
  );
}
