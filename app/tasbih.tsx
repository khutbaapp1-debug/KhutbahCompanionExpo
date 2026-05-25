import * as Haptics from 'expo-haptics';
import { Stack } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const DHIKR_PRESETS = [
  { id: 'subhanallah', text: 'سُبْحَانَ ٱللَّٰهِ', translation: 'SubhanAllah', target: 33 },
  { id: 'alhamdulillah', text: 'ٱلْحَمْدُ لِلَّٰهِ', translation: 'Alhamdulillah', target: 33 },
  { id: 'allahu-akbar', text: 'ٱللَّٰهُ أَكْبَرُ', translation: 'Allahu Akbar', target: 34 },
  { id: 'la-ilaha', text: 'لَا إِلَٰهَ إِلَّا ٱللَّٰهُ', translation: 'La ilaha illallah', target: 100 },
  { id: 'astaghfirullah', text: 'أَسْتَغْفِرُ ٱللَّٰهَ', translation: 'Astaghfirullah', target: 100 },
  { id: 'salawat', text: 'ٱللَّٰهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ', translation: 'Allahumma salli ala Muhammad', target: 100 },
  { id: 'la-hawla', text: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِٱللَّٰهِ', translation: 'La hawla wa la quwwata illa billah', target: 100 },
  { id: 'subhanallahi-wabihamdihi', text: 'سُبْحَانَ ٱللَّٰهِ وَبِحَمْدِهِ', translation: 'Subhanallahi wa bihamdihi', target: 100 },
  { id: 'tawhid-full', text: 'لَا إِلَٰهَ إِلَّا ٱللَّٰهُ وَحْدَهُ لَا شَرِيكَ لَهُ', translation: 'La ilaha illallah wahdahu la sharika lah', target: 100 },
] as const;

type DhikrId = (typeof DHIKR_PRESETS)[number]['id'];

export default function TasbihScreen() {
  const insets = useSafeAreaInsets();
  const [selectedId, setSelectedId] = useState<DhikrId>('subhanallah');
  const [count, setCount] = useState(0);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [completed, setCompleted] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const completionAnim = useRef(new Animated.Value(0)).current;

  const preset = DHIKR_PRESETS.find((p) => p.id === selectedId)!;

  const resetForPreset = (id: DhikrId) => {
    setSelectedId(id);
    setCount(0);
    setCompleted(false);
  };

  const animateTap = useCallback(() => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.93, duration: 60, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
  }, [scaleAnim]);

  const animateCompletion = useCallback(() => {
    Animated.sequence([
      Animated.timing(completionAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(800),
      Animated.timing(completionAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [completionAnim]);

  const handleTap = () => {
    if (completed) return;

    animateTap();
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const next = count + 1;
    setCount(next);
    setSessionTotal((t) => t + 1);

    if (next >= preset.target) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCompleted(true);
      animateCompletion();
      setTimeout(() => {
        setCount(0);
        setCompleted(false);
      }, 1200);
    }
  };

  const confirmReset = () => {
    Alert.alert('Reset Counter', 'Reset the current count to zero?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: () => {
          setCount(0);
          setCompleted(false);
        },
      },
    ]);
  };

  const progress = Math.min(count / preset.target, 1);
  const circumference = 2 * Math.PI * 80;
  const strokeDashoffset = circumference * (1 - progress);

  const completionScale = completionAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });

  return (
    <>
      <Stack.Screen options={{ title: 'Tasbih Counter' }} />
      <View style={{ flex: 1, backgroundColor: 'white' }}>
        {/* Current dhikr display */}
        <View
          style={{
            alignItems: 'center',
            paddingTop: 20,
            paddingBottom: 8,
            borderBottomWidth: 1,
            borderBottomColor: '#F3F4F6',
          }}
        >
          <Text
            style={{
              fontFamily: 'KFGQPCHafs',
              fontSize: 28,
              color: '#0F766E',
              textAlign: 'center',
              lineHeight: 54,
            }}
          >
            {preset.text}
          </Text>
          <Text
            style={{
              fontFamily: 'Inter_400Regular',
              fontSize: 13,
              color: '#6B7280',
              marginTop: 2,
            }}
          >
            {preset.translation} · target {preset.target}
          </Text>
        </View>

        {/* Tap area */}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={{ transform: [{ scale: completed ? completionScale : scaleAnim }] }}>
            <TouchableOpacity
              onPress={handleTap}
              activeOpacity={0.9}
              style={{
                width: 220,
                height: 220,
                borderRadius: 110,
                backgroundColor: completed ? '#0F766E' : '#F0FDFA',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 3,
                borderColor: completed ? '#0F766E' : '#99F6E4',
              }}
            >
              <Text
                style={{
                  fontFamily: 'Inter_700Bold',
                  fontSize: 72,
                  color: completed ? 'white' : '#0F766E',
                  lineHeight: 80,
                }}
              >
                {count}
              </Text>
              {!completed && (
                <Text
                  style={{
                    fontFamily: 'Inter_400Regular',
                    fontSize: 14,
                    color: '#6B7280',
                    marginTop: 4,
                  }}
                >
                  of {preset.target}
                </Text>
              )}
              {completed && (
                <Text
                  style={{
                    fontFamily: 'Inter_600SemiBold',
                    fontSize: 16,
                    color: 'white',
                    marginTop: 4,
                  }}
                >
                  ✓ Complete
                </Text>
              )}
            </TouchableOpacity>
          </Animated.View>

          {/* Progress bar */}
          <View
            style={{
              marginTop: 20,
              width: 200,
              height: 6,
              backgroundColor: '#F3F4F6',
              borderRadius: 3,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                height: 6,
                width: `${Math.round(progress * 100)}%`,
                backgroundColor: '#0F766E',
                borderRadius: 3,
              }}
            />
          </View>

          {/* Session total + reset */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 16,
              marginTop: 16,
            }}
          >
            <Text
              style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: '#9CA3AF' }}
            >
              Session total: {sessionTotal}
            </Text>
            <TouchableOpacity onPress={confirmReset} style={{ padding: 4 }}>
              <Text
                style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: '#DC2626' }}
              >
                Reset
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Dhikr selector */}
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: '#F3F4F6',
            paddingBottom: insets.bottom + 8,
          }}
        >
          <Text
            style={{
              fontFamily: 'Inter_500Medium',
              fontSize: 12,
              color: '#9CA3AF',
              paddingHorizontal: 16,
              paddingTop: 10,
              paddingBottom: 6,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            Select Dhikr
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          >
            {DHIKR_PRESETS.map((p) => (
              <TouchableOpacity
                key={p.id}
                onPress={() => resetForPreset(p.id)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 10,
                  backgroundColor: selectedId === p.id ? '#0F766E' : '#F3F4F6',
                  alignItems: 'center',
                  minWidth: 90,
                }}
              >
                <Text
                  style={{
                    fontFamily: 'KFGQPCHafs',
                    fontSize: 16,
                    color: selectedId === p.id ? 'white' : '#111827',
                    lineHeight: 28,
                  }}
                >
                  {p.text.split(' ').slice(0, 2).join(' ')}
                </Text>
                <Text
                  style={{
                    fontFamily: 'Inter_400Regular',
                    fontSize: 10,
                    color: selectedId === p.id ? '#99F6E4' : '#6B7280',
                    marginTop: 2,
                  }}
                >
                  ×{p.target}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </>
  );
}
