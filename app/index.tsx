import { Link } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';

// Temporary Week 1 navigation harness: a plain list of links to every other
// screen so we can verify routing works. Week 2 replaces this entirely with
// the feature grid UI. This screen is also the NativeWind smoke test — it is
// the only screen converted to className/fonts so far.
const LINKS = [
  { href: '/translation', label: 'Live Translation' },
  { href: '/prayer-times', label: 'Prayer Times' },
  { href: '/qibla', label: 'Qibla Compass' },
  { href: '/quran', label: 'Quran' },
  { href: '/duas', label: 'Daily Duas' },
  { href: '/hadith', label: 'Daily Hadith' },
  { href: '/tasbih', label: 'Tasbih Counter' },
  { href: '/names', label: '99 Names of Allah' },
  { href: '/mosques', label: 'Mosque Finder' },
  { href: '/salah-guide', label: 'Salah Guide' },
  { href: '/wudu-guide', label: 'Wudu Guide' },
  { href: '/settings', label: 'Settings' },
] as const;

export default function HomeScreen() {
  return (
    <View className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{ padding: 24, alignItems: 'center' }}>
        <Text className="mb-6 text-xl font-sans-semibold text-primary">
          Hello, this is Home
        </Text>
        {LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="py-3 text-base font-sans">
            {link.label}
          </Link>
        ))}
      </ScrollView>
    </View>
  );
}
