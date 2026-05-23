import { Link } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';

// Temporary Week 1 navigation harness: a plain list of links to every other
// screen so we can verify routing works. Week 2 replaces this entirely with
// the feature grid UI.
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
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView contentContainerStyle={{ padding: 24, alignItems: 'center' }}>
        <Text style={{ color: '#000', fontSize: 20, fontWeight: '600', marginBottom: 24 }}>
          Hello, this is Home
        </Text>
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            style={{ color: '#0a7ea4', fontSize: 16, paddingVertical: 12 }}
          >
            {link.label}
          </Link>
        ))}
      </ScrollView>
    </View>
  );
}
