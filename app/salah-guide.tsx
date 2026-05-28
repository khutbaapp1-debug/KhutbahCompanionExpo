import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Image,
  type ImageSourcePropType,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import PagerView from 'react-native-pager-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { prayerFlows, PrayerType, PrayerFlowCard } from '../src/data/prayer-flows';
import { wuduSteps } from '../src/data/wudu-steps';
import { useTheme } from '../src/lib/theme-context';

type MainTab = 'wudu' | 'how-to-pray' | 'prayers';
type PrayerTab = PrayerType;

const MAIN_TABS: { id: MainTab; label: string }[] = [
  { id: 'wudu', label: 'Wudu' },
  { id: 'how-to-pray', label: 'How to Pray' },
  { id: 'prayers', label: 'Info' },
];

const PRAYER_TABS: { id: PrayerTab; label: string; sub: string }[] = [
  { id: '2rakat', label: 'Fajr', sub: '2 rakat' },
  { id: '4rakat', label: 'Dhuhr / Asr / Isha', sub: '4 rakat' },
  { id: 'maghrib', label: 'Maghrib', sub: '3 rakat' },
  { id: 'witr', label: 'Witr', sub: '3 rakat' },
];

// Photographed wudu steps. Steps 1/2/10 (intention, bismillah, closing dua) have
// no image; step 8 covers head + ears + neck, so wudu-ears has no separate step.
const WUDU_IMAGES: Record<number, ImageSourcePropType> = {
  3: require('../assets/images/wudu/wudu-hands.jpg'),
  4: require('../assets/images/wudu/wudu-mouth.jpg'),
  5: require('../assets/images/wudu/wudu-nose.jpg'),
  6: require('../assets/images/wudu/wudu-face.jpg'),
  7: require('../assets/images/wudu/wudu-arms.jpg'),
  8: require('../assets/images/wudu/wudu-head.jpg'),
  9: require('../assets/images/wudu/wudu-feet.jpg'),
};

// ─── Wudu tab ─────────────────────────────────────────────────────────────────

function WuduTab() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const [stepIdx, setStepIdx] = useState(0);
  const pagerRef = useRef<PagerView>(null);

  const step = wuduSteps[stepIdx];
  const total = wuduSteps.length;

  const goTo = (idx: number) => {
    const clamped = Math.max(0, Math.min(idx, total - 1));
    setStepIdx(clamped);
    pagerRef.current?.setPage(clamped);
  };

  return (
    <View style={{ flex: 1 }}>
      <PagerView
        ref={pagerRef}
        style={{ flex: 1 }}
        initialPage={0}
        onPageSelected={(e) => setStepIdx(e.nativeEvent.position)}
      >
        {wuduSteps.map((s) => (
          <ScrollView
            key={s.number}
            contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 80 }}
          >
            {/* Step number badge */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: theme.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={{ fontFamily: 'Inter_700Bold', fontSize: 14, color: 'white' }}
                >
                  {s.number}
                </Text>
              </View>
              <Text
                style={{ fontFamily: 'Inter_600SemiBold', fontSize: 18, color: theme.text, flex: 1 }}
              >
                {s.title}
              </Text>
            </View>

            {/* Step photo (where available) */}
            {WUDU_IMAGES[s.number] && (
              <Image
                source={WUDU_IMAGES[s.number]}
                resizeMode="contain"
                style={{ width: '100%', height: 220, marginBottom: 16, borderRadius: 12 }}
              />
            )}

            {/* Description */}
            <Text
              style={{
                fontFamily: 'Inter_400Regular',
                fontSize: 15,
                color: theme.textSecondary,
                lineHeight: 24,
                marginBottom: 16,
              }}
            >
              {s.description}
            </Text>

            {/* Note */}
            {s.note && (
              <View
                style={{
                  backgroundColor: '#FFFBEB',
                  borderRadius: 10,
                  padding: 12,
                  marginBottom: 16,
                  borderLeftWidth: 3,
                  borderLeftColor: '#F59E0B',
                }}
              >
                <Text
                  style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: '#92400E', lineHeight: 20 }}
                >
                  {s.note}
                </Text>
              </View>
            )}

            {/* Recitations */}
            {s.recitations?.map((r, ri) => (
              <View
                key={ri}
                style={{
                  backgroundColor: theme.primaryContainer,
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 10,
                  borderWidth: 1,
                  borderColor: theme.primary,
                }}
              >
                <Text
                  style={{
                    fontFamily: 'Inter_500Medium',
                    fontSize: 11,
                    color: theme.primary,
                    marginBottom: 8,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  {r.name}
                </Text>
                <Text
                  style={{
                    fontFamily: 'KFGQPCHafs',
                    fontSize: 22,
                    color: theme.text,
                    lineHeight: 44,
                    textAlign: 'right',
                    marginBottom: 8,
                  }}
                >
                  {r.arabic}
                </Text>
                <Text
                  style={{
                    fontFamily: 'Inter_400Regular',
                    fontSize: 13,
                    color: theme.textMuted,
                    fontStyle: 'italic',
                    marginBottom: 6,
                  }}
                >
                  {r.transliteration}
                </Text>
                <Text
                  style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: theme.textSecondary, lineHeight: 20 }}
                >
                  {r.meaning}
                </Text>
              </View>
            ))}
          </ScrollView>
        ))}
      </PagerView>

      {/* Navigation footer */}
      <View
        style={{
          position: 'absolute',
          bottom: insets.bottom + 8,
          left: 0,
          right: 0,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
        }}
      >
        <TouchableOpacity
          onPress={() => goTo(stepIdx - 1)}
          disabled={stepIdx === 0}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            opacity: stepIdx === 0 ? 0.3 : 1,
            backgroundColor: theme.card,
            borderRadius: 8,
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderWidth: 1,
            borderColor: theme.border,
          }}
        >
          <Ionicons name="chevron-back" size={16} color={theme.textSecondary} />
          <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: theme.textSecondary }}>Prev</Text>
        </TouchableOpacity>

        <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: theme.textMuted }}>
          {stepIdx + 1} / {total}
        </Text>

        <TouchableOpacity
          onPress={() => goTo(stepIdx + 1)}
          disabled={stepIdx === total - 1}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            opacity: stepIdx === total - 1 ? 0.3 : 1,
            backgroundColor: theme.primary,
            borderRadius: 8,
            paddingHorizontal: 14,
            paddingVertical: 10,
          }}
        >
          <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: 'white' }}>Next</Text>
          <Ionicons name="chevron-forward" size={16} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── How to Pray tab ──────────────────────────────────────────────────────────

function HowToPrayTab() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  return (
    <ScrollView
      contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 20 }}
    >
      <Text
        style={{
          fontFamily: 'Inter_600SemiBold',
          fontSize: 18,
          color: theme.text,
          marginBottom: 12,
        }}
      >
        Structure of Salah
      </Text>

      {[
        {
          title: 'The Five Daily Prayers',
          body: 'Muslims are obligated to pray five times per day: Fajr (dawn), Dhuhr (midday), Asr (afternoon), Maghrib (after sunset), and Isha (night).',
        },
        {
          title: 'Rakat',
          body: 'Each prayer consists of units called rakat. Fajr is 2 rakat, Dhuhr and Asr are 4 rakat each, Maghrib is 3 rakat, and Isha is 4 rakat. Witr is an optional night prayer of 3 rakat.',
        },
        {
          title: 'Prerequisites',
          body: "Before praying, you must: (1) be in a state of ritual purity — perform wudu if you haven't already; (2) ensure your body, clothes, and prayer area are clean; (3) face the qibla (direction of the Kaaba in Makkah); (4) cover your awrah.",
        },
        {
          title: 'What invalidates your prayer',
          body: 'The following break the prayer and require you to start again: speaking (other than prayer words), eating or drinking, excessive movement, breaking wudu (passing wind, etc.), or laughing aloud.',
        },
        {
          title: 'Congregation (Jama\'ah)',
          body: "Praying in congregation carries a reward 27 times that of praying alone. When praying behind an imam, follow the imam's movements — do not start a position before the imam.",
        },
      ].map((item, i) => (
        <View
          key={i}
          style={{
            marginBottom: 16,
            backgroundColor: theme.surface,
            borderRadius: 12,
            padding: 16,
            borderWidth: 1,
            borderColor: theme.border,
          }}
        >
          <Text
            style={{
              fontFamily: 'Inter_600SemiBold',
              fontSize: 15,
              color: theme.primary,
              marginBottom: 6,
            }}
          >
            {item.title}
          </Text>
          <Text
            style={{
              fontFamily: 'Inter_400Regular',
              fontSize: 14,
              color: theme.textSecondary,
              lineHeight: 22,
            }}
          >
            {item.body}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

// ─── Prayers tab ──────────────────────────────────────────────────────────────

function PrayersTab() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const [prayerType, setPrayerType] = useState<PrayerTab>('2rakat');
  const [cardIdx, setCardIdx] = useState(0);
  const pagerRef = useRef<PagerView>(null);

  const cards: PrayerFlowCard[] = prayerFlows[prayerType];

  const switchPrayer = (type: PrayerTab) => {
    setPrayerType(type);
    setCardIdx(0);
    pagerRef.current?.setPage(0);
  };

  const goTo = (idx: number) => {
    const clamped = Math.max(0, Math.min(idx, cards.length - 1));
    setCardIdx(clamped);
    pagerRef.current?.setPage(clamped);
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Prayer type selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ borderBottomWidth: 1, borderBottomColor: theme.border, flexGrow: 0 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}
      >
        {PRAYER_TABS.map((pt) => (
          <TouchableOpacity
            key={pt.id}
            onPress={() => switchPrayer(pt.id)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 10,
              backgroundColor: prayerType === pt.id ? theme.primary : theme.surface,
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                fontFamily: 'Inter_600SemiBold',
                fontSize: 13,
                color: prayerType === pt.id ? 'white' : theme.textSecondary,
              }}
            >
              {pt.label}
            </Text>
            <Text
              style={{
                fontFamily: 'Inter_400Regular',
                fontSize: 11,
                color: prayerType === pt.id ? '#99F6E4' : theme.textMuted,
                marginTop: 1,
              }}
            >
              {pt.sub}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Step cards pager */}
      <PagerView
        ref={pagerRef}
        style={{ flex: 1 }}
        initialPage={0}
        key={prayerType}
        onPageSelected={(e) => setCardIdx(e.nativeEvent.position)}
      >
        {cards.map((card) => (
          <ScrollView
            key={card.number}
            contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 80 }}
          >
            {card.image && (
              <Image
                source={card.image}
                style={{
                  width: '100%',
                  height: 220,
                  resizeMode: 'contain',
                  marginBottom: 12,
                  borderRadius: 8,
                }}
              />
            )}

            {/* Card header */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: 10,
                marginBottom: 14,
              }}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: theme.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: 2,
                }}
              >
                <Text
                  style={{ fontFamily: 'Inter_700Bold', fontSize: 12, color: 'white' }}
                >
                  {card.number}
                </Text>
              </View>
              <Text
                style={{
                  fontFamily: 'Inter_600SemiBold',
                  fontSize: 16,
                  color: theme.text,
                  flex: 1,
                  lineHeight: 24,
                }}
              >
                {card.title}
              </Text>
            </View>

            {/* Description */}
            <Text
              style={{
                fontFamily: 'Inter_400Regular',
                fontSize: 14,
                color: theme.textSecondary,
                lineHeight: 22,
                marginBottom: 14,
              }}
            >
              {card.description}
            </Text>

            {/* Note */}
            {card.note && (
              <View
                style={{
                  backgroundColor: '#FFFBEB',
                  borderRadius: 10,
                  padding: 12,
                  marginBottom: 14,
                  borderLeftWidth: 3,
                  borderLeftColor: '#F59E0B',
                }}
              >
                <Text
                  style={{
                    fontFamily: 'Inter_400Regular',
                    fontSize: 13,
                    color: '#92400E',
                    lineHeight: 20,
                  }}
                >
                  {card.note}
                </Text>
              </View>
            )}

            {/* Recitations */}
            {card.recitations?.map((r, ri) => (
              <View
                key={ri}
                style={{
                  backgroundColor: theme.primaryContainer,
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 10,
                  borderWidth: 1,
                  borderColor: theme.primary,
                }}
              >
                <Text
                  style={{
                    fontFamily: 'Inter_500Medium',
                    fontSize: 11,
                    color: theme.primary,
                    marginBottom: 4,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  {r.label ?? r.name}
                </Text>
                <Text
                  style={{
                    fontFamily: 'KFGQPCHafs',
                    fontSize: 22,
                    color: theme.text,
                    lineHeight: 44,
                    textAlign: 'right',
                    marginBottom: 8,
                  }}
                >
                  {r.arabic}
                </Text>
                <Text
                  style={{
                    fontFamily: 'Inter_400Regular',
                    fontSize: 13,
                    color: theme.textMuted,
                    fontStyle: 'italic',
                    marginBottom: 6,
                  }}
                >
                  {r.transliteration}
                </Text>
                <Text
                  style={{
                    fontFamily: 'Inter_400Regular',
                    fontSize: 13,
                    color: theme.textSecondary,
                    lineHeight: 20,
                  }}
                >
                  {r.meaning}
                </Text>
              </View>
            ))}
          </ScrollView>
        ))}
      </PagerView>

      {/* Navigation footer */}
      <View
        style={{
          position: 'absolute',
          bottom: insets.bottom + 8,
          left: 0,
          right: 0,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
        }}
      >
        <TouchableOpacity
          onPress={() => goTo(cardIdx - 1)}
          disabled={cardIdx === 0}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            opacity: cardIdx === 0 ? 0.3 : 1,
            backgroundColor: theme.card,
            borderRadius: 8,
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderWidth: 1,
            borderColor: theme.border,
          }}
        >
          <Ionicons name="chevron-back" size={16} color={theme.textSecondary} />
          <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: theme.textSecondary }}>Prev</Text>
        </TouchableOpacity>

        <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: theme.textMuted }}>
          {cardIdx + 1} / {cards.length}
        </Text>

        <TouchableOpacity
          onPress={() => goTo(cardIdx + 1)}
          disabled={cardIdx === cards.length - 1}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            opacity: cardIdx === cards.length - 1 ? 0.3 : 1,
            backgroundColor: theme.primary,
            borderRadius: 8,
            paddingHorizontal: 14,
            paddingVertical: 10,
          }}
        >
          <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: 'white' }}>Next</Text>
          <Ionicons name="chevron-forward" size={16} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Root screen ──────────────────────────────────────────────────────────────

export default function SalahGuideScreen() {
  const [activeTab, setActiveTab] = useState<MainTab>('wudu');
  const { theme } = useTheme();

  return (
    <>
      <Stack.Screen options={{ title: 'Salah & Wudu Guide' }} />
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        {/* Tab bar */}
        <View
          style={{
            flexDirection: 'row',
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
          }}
        >
          {MAIN_TABS.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                paddingVertical: 12,
                alignItems: 'center',
                borderBottomWidth: 2,
                borderBottomColor: activeTab === tab.id ? theme.primary : 'transparent',
              }}
            >
              <Text
                style={{
                  fontFamily: activeTab === tab.id ? 'Inter_600SemiBold' : 'Inter_400Regular',
                  fontSize: 14,
                  color: activeTab === tab.id ? theme.primary : theme.textMuted,
                }}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab content */}
        {activeTab === 'wudu' && <WuduTab />}
        {/* Tab 2 "How to Pray" shows the step-by-step prayer flows; tab 3 "Info"
            shows the general guidance (content swapped per design). */}
        {activeTab === 'how-to-pray' && <PrayersTab />}
        {activeTab === 'prayers' && <HowToPrayTab />}
      </View>
    </>
  );
}
