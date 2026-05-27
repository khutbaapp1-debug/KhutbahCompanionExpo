import { Text, View } from 'react-native';

import { useTheme } from '../src/lib/theme-context';

export default function MosquesScreen() {
  const { theme } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.background,
      }}
    >
      <Text style={{ color: theme.text, fontSize: 18 }}>Hello, this is Mosque Finder</Text>
    </View>
  );
}
