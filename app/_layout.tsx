import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Root layout: a single Stack navigator (no bottom tabs in this app).
// Screen titles are configured centrally here so each screen file can stay
// minimal. Per-screen header customization comes in Week 2.
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Stack>
        <Stack.Screen name="index" options={{ title: 'Home' }} />
        <Stack.Screen name="translation" options={{ title: 'Live Translation' }} />
        <Stack.Screen name="prayer-times" options={{ title: 'Prayer Times' }} />
        <Stack.Screen name="qibla" options={{ title: 'Qibla Compass' }} />
        <Stack.Screen name="quran/index" options={{ title: 'Quran' }} />
        <Stack.Screen name="quran/[surahNumber]" options={{ title: 'Surah' }} />
        <Stack.Screen name="duas" options={{ title: 'Daily Duas' }} />
        <Stack.Screen name="hadith" options={{ title: 'Daily Hadith' }} />
        <Stack.Screen name="tasbih" options={{ title: 'Tasbih Counter' }} />
        <Stack.Screen name="names" options={{ title: '99 Names of Allah' }} />
        <Stack.Screen name="mosques" options={{ title: 'Mosque Finder' }} />
        <Stack.Screen name="salah-guide" options={{ title: 'Salah Guide' }} />
        <Stack.Screen name="wudu-guide" options={{ title: 'Wudu Guide' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
