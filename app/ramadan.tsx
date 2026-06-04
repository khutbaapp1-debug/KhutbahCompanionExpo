import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PremiumPaywall } from '../src/components/PremiumPaywall';
import { usePremium } from '../src/hooks/usePremium';
import { getStoredLocation } from '../src/lib/location';
import { getPrayerSettings } from '../src/lib/prayer-settings';
import {
  formatCountdown,
  formatTime12Hour,
  getPrayerTimesForDate,
} from '../src/lib/prayer-times';
import { useTheme } from '../src/lib/theme-context';

const QURAN_PLAN_KEY = 'ramadan-quran-plan-v1';
const CHECKLIST_KEY_PREFIX = 'ramadan-checklist-v2-';
const QURAN_TOTAL_DAYS = 30;
const PAGES_PER_DAY = 20;

const CHECKLIST_ITEMS = [
  { id: 'tahajjud',       label: 'Tahajjud prayed (last third of night)' },
  { id: 'witr',           label: 'Witr prayed (before Fajr)' },
  { id: 'morning-adhkar', label: 'Morning Adhkar completed (after Fajr)' },
  { id: 'duha',           label: 'Duha prayer prayed (after sunrise)' },
  { id: 'evening-adhkar', label: 'Evening Adhkar completed (after Asr)' },
  { id: 'awwabin',        label: 'Awwabin prayed (6 rakats after Maghrib)' },
  { id: 'iftar-share',    label: 'Gave Iftar to someone' },
  { id: 'tarawih',        label: 'Tarawih prayed (after Isha)' },
  { id: 'quran-juz',      label: 'Read 1 Juz today' },
  { id: 'sadaqah',        label: 'Gave Sadaqah today' },
  { id: 'istighfar',      label: 'Istighfar ×100' },
  { id: 'family',         label: 'Called or checked on family' },
] as const;

const NAFIL_GUIDE = [
  { name: 'Tahajjud', desc: '2–12 rakats in the last third of night. The most accepted time for dua.' },
  { name: 'Duha',     desc: '2–8 rakats after sunrise until midday. Reward of a complete Umrah.' },
  { name: 'Awwabin',  desc: '6 rakats after Maghrib. Equivalent to 12 years of worship.' },
  { name: 'Witr',     desc: '1–11 rakats before Fajr. Seal the night with this prayer.' },
] as const;

function todayKey(): string {
  return new Date().toISOString().split('T')[0] ?? '';
}

function getHijriDate(): string {
  try {
    return new Intl.DateTimeFormat('en-u-ca-islamic', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date());
  } catch {
    return '';
  }
}

export default function RamadanScreen() {
  const { theme } = useTheme();
  const { isPremium } = usePremium();
  const insets = useSafeAreaInsets();
  const [showPaywall, setShowPaywall] = useState(false);

  const [fajrTime, setFajrTime] = useState<Date | null>(null);
  const [maghribTime, setMaghribTime] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState<{ label: string; value: string } | null>(null);
  const [hasLocation, setHasLocation] = useState<boolean | null>(null);

  const [completedDays, setCompletedDays] = useState<Set<number>>(new Set());
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [showNafilGuide, setShowNafilGuide] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    async function loadPrayers() {
      const location = await getStoredLocation();
      if (!location) {
        setHasLocation(false);
        return;
      }
      setHasLocation(true);
      const settings = await getPrayerSettings();
      const times = getPrayerTimesForDate(new Date(), location, settings);
      setFajrTime(times.fajr);
      setMaghribTime(times.maghrib);
    }
    void loadPrayers();
  }, []);

  useEffect(() => {
    if (!fajrTime || !maghribTime) return;
    const tick = () => {
      const now = new Date();
      if (now < fajrTime) {
        setCountdown({ label: 'Suhoor ends in', value: formatCountdown(fajrTime, now) });
      } else if (now < maghribTime) {
        setCountdown({ label: 'Iftar in', value: formatCountdown(maghribTime, now) });
      } else {
        setCountdown({ label: 'Iftar was at', value: formatTime12Hour(maghribTime) });
      }
    };
    tick();
    intervalRef.current = setInterval(tick, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fajrTime, maghribTime]);

  useEffect(() => {
    AsyncStorage.getItem(QURAN_PLAN_KEY).then((raw) => {
      if (raw) setCompletedDays(new Set(JSON.parse(raw) as number[]));
    });
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(CHECKLIST_KEY_PREFIX + todayKey()).then((raw) => {
      if (raw) setChecklist(JSON.parse(raw) as Record<string, boolean>);
    });
  }, []);

  const toggleQuranDay = useCallback((day: number) => {
    setCompletedDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      void AsyncStorage.setItem(QURAN_PLAN_KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  const toggleChecklistItem = useCallback((id: string) => {
    setChecklist((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      void AsyncStorage.setItem(CHECKLIST_KEY_PREFIX + todayKey(), JSON.stringify(next));
      return next;
    });
  }, []);

  if (!isPremium) {
    return (
      <>
        <Stack.Screen options={{ title: 'Ramadan' }} />
        <View style={{ flex: 1, backgroundColor: theme.background, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Ionicons name="lock-closed-outline" size={48} color={theme.textMuted} />
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 18, color: theme.text, marginTop: 16, marginBottom: 8, textAlign: 'center' }}>
            Premium Feature
          </Text>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: theme.textMuted, textAlign: 'center', marginBottom: 24, lineHeight: 22 }}>
            Suhoor & Iftar timers, 30-day Quran tracker, and Tarawih counter — all in one place. Upgrade to unlock.
          </Text>
          <TouchableOpacity
            onPress={() => setShowPaywall(true)}
            style={{ backgroundColor: theme.primary, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24 }}
          >
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 15, color: 'white' }}>Upgrade to Premium</Text>
          </TouchableOpacity>
          <PremiumPaywall visible={showPaywall} onDismiss={() => setShowPaywall(false)} />
        </View>
      </>
    );
  }

  const hijriDate = getHijriDate();
  const gregorianDate = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <>
      <Stack.Screen options={{ title: 'Ramadan' }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.background }}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}
      >
        {/* Date banner */}
        <View style={{ backgroundColor: theme.primary, borderRadius: 16, padding: 20, marginBottom: 16, alignItems: 'center' }}>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: 'rgba(255,255,255,0.85)', marginBottom: 4 }}>
            {gregorianDate}
          </Text>
          {!!hijriDate && (
            <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 18, color: 'white' }}>
              {hijriDate}
            </Text>
          )}
        </View>

        {/* Suhoor / Iftar */}
        <View
          style={{
            backgroundColor: theme.card, borderRadius: 16, padding: 20,
            marginBottom: 16, borderWidth: 1, borderColor: theme.border,
          }}
        >
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>
            Today's Timings
          </Text>

          {hasLocation === false && (
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: theme.textMuted }}>
              Enable location in Prayer Times to see Suhoor and Iftar times.
            </Text>
          )}

          {hasLocation === true && (
            <>
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: countdown ? 12 : 0 }}>
                <View style={{ flex: 1, backgroundColor: theme.surface, borderRadius: 12, padding: 14, alignItems: 'center' }}>
                  <Ionicons name="moon-outline" size={22} color={theme.primary} />
                  <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: theme.textMuted, marginTop: 6, marginBottom: 2 }}>
                    Suhoor ends
                  </Text>
                  <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 16, color: theme.text }}>
                    {fajrTime ? formatTime12Hour(fajrTime) : '—'}
                  </Text>
                </View>
                <View style={{ flex: 1, backgroundColor: theme.surface, borderRadius: 12, padding: 14, alignItems: 'center' }}>
                  <Ionicons name="sunny-outline" size={22} color={theme.primary} />
                  <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: theme.textMuted, marginTop: 6, marginBottom: 2 }}>
                    Iftar
                  </Text>
                  <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 16, color: theme.text }}>
                    {maghribTime ? formatTime12Hour(maghribTime) : '—'}
                  </Text>
                </View>
              </View>
              {countdown && (
                <View style={{ backgroundColor: theme.primaryContainer, borderRadius: 10, padding: 14, alignItems: 'center' }}>
                  <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: theme.primary }}>
                    {countdown.label}
                  </Text>
                  <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 28, color: theme.primary, fontVariant: ['tabular-nums'] }}>
                    {countdown.value}
                  </Text>
                </View>
              )}
            </>
          )}
        </View>

        {/* Quran reading plan */}
        <View
          style={{
            backgroundColor: theme.card, borderRadius: 16, padding: 20,
            marginBottom: 16, borderWidth: 1, borderColor: theme.border,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <Text style={{ flex: 1, fontFamily: 'Inter_600SemiBold', fontSize: 16, color: theme.text }}>
              Quran Reading Plan
            </Text>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: theme.textMuted }}>
              {completedDays.size}/{QURAN_TOTAL_DAYS} days
            </Text>
          </View>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: theme.textMuted, marginBottom: 14 }}>
            {PAGES_PER_DAY} pages/day · tap a day to mark it complete
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {Array.from({ length: QURAN_TOTAL_DAYS }, (_, i) => i + 1).map((day) => {
              const done = completedDays.has(day);
              return (
                <TouchableOpacity
                  key={day}
                  onPress={() => toggleQuranDay(day)}
                  style={{
                    width: 40, height: 40, borderRadius: 10,
                    backgroundColor: done ? theme.primary : theme.surface,
                    borderWidth: 1, borderColor: done ? theme.primary : theme.border,
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: done ? 'white' : theme.textSecondary }}>
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Daily acts of worship checklist — resets at midnight via date-keyed storage */}
        <View
          style={{
            backgroundColor: theme.card, borderRadius: 16, padding: 20,
            borderWidth: 1, borderColor: theme.border,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ flex: 1, fontFamily: 'Inter_600SemiBold', fontSize: 16, color: theme.text }}>
              Daily Acts of Worship
            </Text>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: theme.textMuted }}>
              {CHECKLIST_ITEMS.filter((item) => checklist[item.id]).length} of {CHECKLIST_ITEMS.length} completed
            </Text>
          </View>
          {CHECKLIST_ITEMS.map((item, idx) => {
            const checked = !!checklist[item.id];
            const isLast = idx === CHECKLIST_ITEMS.length - 1;
            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => toggleChecklistItem(item.id)}
                activeOpacity={0.7}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 12,
                  borderBottomWidth: isLast ? 0 : 1,
                  borderBottomColor: theme.border,
                  gap: 12,
                }}
              >
                <Ionicons
                  name={checked ? 'checkmark-circle' : 'ellipse-outline'}
                  size={22}
                  color={checked ? theme.primary : theme.textMuted}
                />
                <Text
                  style={{
                    flex: 1,
                    fontFamily: checked ? 'Inter_500Medium' : 'Inter_400Regular',
                    fontSize: 14,
                    color: checked ? theme.text : theme.textSecondary,
                    textDecorationLine: checked ? 'line-through' : 'none',
                  }}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Nafil prayer guide — collapsible */}
        <View
          style={{
            backgroundColor: theme.card, borderRadius: 16, marginTop: 16,
            borderWidth: 1, borderColor: theme.border, overflow: 'hidden',
          }}
        >
          <TouchableOpacity
            onPress={() => setShowNafilGuide((v) => !v)}
            activeOpacity={0.7}
            style={{ flexDirection: 'row', alignItems: 'center', padding: 20, gap: 12 }}
          >
            <Text style={{ flex: 1, fontFamily: 'Inter_600SemiBold', fontSize: 16, color: theme.text }}>
              Nafil Prayer Guide
            </Text>
            <Ionicons
              name={showNafilGuide ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={theme.textMuted}
            />
          </TouchableOpacity>
          {showNafilGuide && (
            <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
              {NAFIL_GUIDE.map((item) => (
                <View
                  key={item.name}
                  style={{ paddingVertical: 14, borderTopWidth: 1, borderTopColor: theme.border }}
                >
                  <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: theme.primary, marginBottom: 4 }}>
                    {item.name}
                  </Text>
                  <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: theme.textSecondary, lineHeight: 20 }}>
                    {item.desc}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </>
  );
}
