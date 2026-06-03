import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Stack } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePremium } from '../src/hooks/usePremium';
import { useTheme } from '../src/lib/theme-context';
import { PremiumPaywall } from '../src/components/PremiumPaywall';

// Arabic copied verbatim from the original presets — not retyped.
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

const ALL_IDS = DHIKR_PRESETS.map((p) => p.id);
const FREE_DHIKR_IDS: DhikrId[] = ['subhanallah', 'alhamdulillah', 'allahu-akbar'];
const byId = (id: DhikrId) => DHIKR_PRESETS.find((p) => p.id === id)!;

// Full width minus 48dp padding, capped so it fits shorter screens (≥200dp).
const CIRCLE = Math.min(Dimensions.get('window').width - 48, 280);

const ARABIC_FONT = 'NotoNaskhArabic_400Regular';

export default function TasbihScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { isPremium } = usePremium();
  const [selectedId, setSelectedId] = useState<DhikrId>('subhanallah');
  const [count, setCount] = useState(0);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [completedIds, setCompletedIds] = useState<DhikrId[]>([]);
  const [advancing, setAdvancing] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const preset = byId(selectedId);

  // Display order: uncompleted (original order) first, completed pushed to the end.
  const orderedIds: DhikrId[] = [
    ...ALL_IDS.filter((id) => !completedIds.includes(id)),
    ...completedIds,
  ];
  const nextId = orderedIds.find(
    (id) => id !== selectedId && !completedIds.includes(id) && (isPremium || FREE_DHIKR_IDS.includes(id)),
  );
  const accessibleIds = isPremium ? ALL_IDS : FREE_DHIKR_IDS;
  const allDone = accessibleIds.every((id) => completedIds.includes(id));

  const animateTap = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.95, duration: 60, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
  };

  // Selecting a card makes it current; if it was completed, re-activate it.
  const selectDhikr = (id: DhikrId) => {
    setSelectedId(id);
    setCount(0);
    setCompletedIds((prev) => prev.filter((c) => c !== id));
  };

  const handleTap = () => {
    if (advancing) return;
    animateTap();
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const next = count + 1;
    setCount(next);
    setSessionTotal((t) => t + 1);

    if (next >= preset.target) {
      // Target reached: success haptic, brief pause, then auto-advance.
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setAdvancing(true);
      setTimeout(() => {
        const newCompleted = completedIds.includes(selectedId)
          ? completedIds
          : [...completedIds, selectedId];
        const accessible = isPremium ? ALL_IDS : FREE_DHIKR_IDS;
        const remaining = accessible.filter((id) => !newCompleted.includes(id));
        setCompletedIds(newCompleted);
        if (remaining.length > 0) setSelectedId(remaining[0]);
        setCount(0);
        setAdvancing(false);
      }, 800);
    }
  };

  const resetAll = () => {
    setCount(0);
    setSessionTotal(0);
    setCompletedIds([]);
    setSelectedId('subhanallah');
    setAdvancing(false);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Tasbih Counter',
          headerRight: () => (
            <TouchableOpacity onPress={resetAll} style={{ marginRight: 4 }} hitSlop={12}>
              <Ionicons name="refresh" size={22} color={theme.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        {/* Main counter area */}
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 24,
          }}
        >
          <Text
            style={{
              fontFamily: ARABIC_FONT,
              fontSize: 34,
              color: theme.primary,
              textAlign: 'center',
              lineHeight: 60,
            }}
          >
            {preset.text}
          </Text>
          <Text
            style={{
              fontFamily: 'Inter_400Regular',
              fontSize: 18,
              color: theme.textMuted,
              marginTop: 4,
              marginBottom: 24,
              textAlign: 'center',
            }}
          >
            {preset.translation}
          </Text>

          {/* Large tap circle */}
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
              onPress={handleTap}
              activeOpacity={0.85}
              style={{
                width: CIRCLE,
                height: CIRCLE,
                borderRadius: CIRCLE / 2,
                backgroundColor: theme.primary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  fontFamily: 'Inter_700Bold',
                  fontSize: 72,
                  color: theme.background,
                  lineHeight: 84,
                }}
              >
                {count}
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {/* count / target */}
          <Text
            style={{
              fontFamily: 'Inter_600SemiBold',
              fontSize: 18,
              color: theme.textSecondary,
              marginTop: 20,
            }}
          >
            {count} / {preset.target}
          </Text>
          <Text
            style={{
              fontFamily: 'Inter_400Regular',
              fontSize: 13,
              color: theme.textMuted,
              marginTop: 4,
            }}
          >
            {allDone ? 'All dhikr complete — alhamdulillah' : `Session total: ${sessionTotal}`}
          </Text>
        </View>

        {/* Dhikr selector */}
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: theme.border,
            paddingBottom: insets.bottom + 8,
          }}
        >
          <Text
            style={{
              fontFamily: 'Inter_500Medium',
              fontSize: 12,
              color: theme.textMuted,
              paddingHorizontal: 16,
              paddingTop: 10,
              paddingBottom: 8,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            Select Dhikr
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 4, gap: 8 }}
          >
            {orderedIds.map((id) => {
              const p = byId(id);
              const isSelected = id === selectedId;
              const isCompleted = completedIds.includes(id);
              const isNext = id === nextId;
              const isLocked = !isPremium && !FREE_DHIKR_IDS.includes(id);
              return (
                <TouchableOpacity
                  key={id}
                  onPress={() => {
                    if (isLocked) {
                      setShowPaywall(true);
                      return;
                    }
                    selectDhikr(id);
                  }}
                  style={{
                    width: 160,
                    padding: 12,
                    borderRadius: 14,
                    borderWidth: 2,
                    borderColor: isSelected
                      ? theme.primary
                      : isNext
                        ? theme.primaryContainer
                        : theme.border,
                    backgroundColor: isSelected ? theme.primaryContainer : theme.card,
                    opacity: isCompleted ? 0.35 : isLocked ? 0.6 : 1,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: ARABIC_FONT,
                      fontSize: 20,
                      color: theme.text,
                      lineHeight: 34,
                      textAlign: 'right',
                    }}
                    numberOfLines={2}
                  >
                    {p.text}
                  </Text>
                  <Text
                    style={{
                      fontFamily: 'Inter_600SemiBold',
                      fontSize: 14,
                      color: theme.text,
                      marginTop: 6,
                    }}
                    numberOfLines={1}
                  >
                    {p.translation}
                  </Text>
                  <Text
                    style={{
                      fontFamily: 'Inter_400Regular',
                      fontSize: 12,
                      color: theme.textMuted,
                      marginTop: 2,
                    }}
                  >
                    {isLocked ? '🔒 Premium' : isCompleted ? '✓ Done' : `Target: ${p.target}`}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
      <PremiumPaywall visible={showPaywall} onDismiss={() => setShowPaywall(false)} />
    </>
  );
}
