import { Stack } from 'expo-router';
import { FlatList, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { namesOfAllah } from '../src/data/names-of-allah';

export default function NamesScreen() {
  const insets = useSafeAreaInsets();

  return (
    <>
      <Stack.Screen options={{ title: '99 Names of Allah' }} />
      <View style={{ flex: 1, backgroundColor: 'white' }}>
        <FlatList
          data={namesOfAllah}
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
        />
      </View>
    </>
  );
}
