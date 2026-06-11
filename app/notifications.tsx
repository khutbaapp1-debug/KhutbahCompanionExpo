import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  ScrollView,
  Switch,
  Text,
  View,
} from 'react-native';

import {
  PRAYERS,
  dhikrKey,
  hadithKey,
  masterKey,
  prayerKey,
  requestNotificationPermissions,
  scheduleAllNotifications,
  type PrayerKey,
} from '../src/lib/notifications';
import { useTheme } from '../src/lib/theme-context';

const HADITH_TIME_KEY = 'hadith-notification-time';
const DHIKR_TIME_KEY = 'dhikr-notification-time';

// ─── Scrollable wheel time picker ────────────────────────────────────────────

const HOUR_VALUES = Array.from({ length: 24 }, (_, i) => i);
const MINUTE_VALUES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
const WHEEL_ITEM_H = 44;

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function parseTimeInts(t: string): { hour: number; minute: number } {
  const parts = t.split(':');
  const h = parseInt(parts[0] ?? '8', 10);
  const m = parseInt(parts[1] ?? '0', 10);
  const hour = isNaN(h) ? 8 : Math.max(0, Math.min(23, h));
  const minute = MINUTE_VALUES.reduce((prev, curr) =>
    Math.abs(curr - (isNaN(m) ? 0 : m)) < Math.abs(prev - (isNaN(m) ? 0 : m)) ? curr : prev,
  );
  return { hour, minute };
}

// Three-row scroll wheel: the middle row is the selected value.
// paddingTop/Bottom = WHEEL_ITEM_H centres item[0] at scroll offset 0,
// and item[n] at scroll offset n * WHEEL_ITEM_H.
function WheelColumn({
  label,
  value,
  values,
  onChange,
}: {
  label: string;
  value: number;
  values: number[];
  onChange: (v: number) => void;
}) {
  const { theme } = useTheme();
  const ref = useRef<FlatList<number>>(null);
  const idx = Math.max(0, values.indexOf(value));

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      ref.current?.scrollToOffset({ offset: idx * WHEEL_ITEM_H, animated: false });
    });
    return () => cancelAnimationFrame(frame);
  }, [idx]);

  const handleScrollEnd = (e: { nativeEvent: { contentOffset: { y: number } } }) => {
    const newIdx = Math.round(e.nativeEvent.contentOffset.y / WHEEL_ITEM_H);
    const clamped = Math.max(0, Math.min(newIdx, values.length - 1));
    const v = values[clamped];
    if (v !== undefined) onChange(v);
  };

  return (
    <View style={{ alignItems: 'center' }}>
      <Text
        style={{
          fontFamily: 'Inter_400Regular',
          fontSize: 11,
          color: theme.textMuted,
          marginBottom: 4,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}
      >
        {label}
      </Text>
      <View style={{ height: WHEEL_ITEM_H * 3, width: 64, overflow: 'hidden' }}>
        {/* Selection highlight in the middle row */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: WHEEL_ITEM_H,
            height: WHEEL_ITEM_H,
            left: 0,
            right: 0,
            backgroundColor: theme.primaryContainer,
            borderRadius: 10,
          }}
        />
        <FlatList
          ref={ref}
          data={values}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item }) => (
            <View style={{ height: WHEEL_ITEM_H, alignItems: 'center', justifyContent: 'center' }}>
              <Text
                style={{
                  fontFamily: 'Inter_700Bold',
                  fontSize: 24,
                  color: item === value ? theme.primary : theme.textMuted,
                }}
              >
                {pad2(item)}
              </Text>
            </View>
          )}
          snapToInterval={WHEEL_ITEM_H}
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          onMomentumScrollEnd={handleScrollEnd}
          onScrollEndDrag={handleScrollEnd}
          contentContainerStyle={{ paddingTop: WHEEL_ITEM_H, paddingBottom: WHEEL_ITEM_H }}
          getItemLayout={(_, index) => ({
            length: WHEEL_ITEM_H,
            offset: WHEEL_ITEM_H * (index + 1),
            index,
          })}
        />
      </View>
    </View>
  );
}

function TimePicker({ value, onChange }: { value: string; onChange: (t: string) => void }) {
  const { theme } = useTheme();
  const { hour, minute } = parseTimeInts(value);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
      <WheelColumn
        label="Hour"
        value={hour}
        values={HOUR_VALUES}
        onChange={(h) => onChange(`${pad2(h)}:${pad2(minute)}`)}
      />
      <Text
        style={{
          fontFamily: 'Inter_700Bold',
          fontSize: 30,
          color: theme.text,
          marginTop: 0,
          marginHorizontal: 4,
        }}
      >
        :
      </Text>
      <WheelColumn
        label="Minute"
        value={minute}
        values={MINUTE_VALUES}
        onChange={(m) => onChange(`${pad2(hour)}:${pad2(m)}`)}
      />
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const [master, setMaster] = useState(true);
  const [prayers, setPrayers] = useState<Record<PrayerKey, boolean>>({
    fajr: false,
    dhuhr: false,
    asr: false,
    maghrib: false,
    isha: false,
  });
  const [hadith, setHadith] = useState(false);
  const [hadithTime, setHadithTime] = useState('08:00');
  const [dhikr, setDhikr] = useState(false);
  const [dhikrTime, setDhikrTime] = useState('07:00');

  useEffect(() => {
    (async () => {
      const m = await AsyncStorage.getItem(masterKey);
      setMaster(m === null ? true : m === 'true');

      const next: Record<PrayerKey, boolean> = {
        fajr: false,
        dhuhr: false,
        asr: false,
        maghrib: false,
        isha: false,
      };
      for (const p of PRAYERS) {
        next[p.key] = (await AsyncStorage.getItem(prayerKey(p.key))) === 'true';
      }
      setPrayers(next);

      setHadith((await AsyncStorage.getItem(hadithKey)) === 'true');
      setHadithTime((await AsyncStorage.getItem(HADITH_TIME_KEY)) ?? '08:00');
      setDhikr((await AsyncStorage.getItem(dhikrKey)) === 'true');
      setDhikrTime((await AsyncStorage.getItem(DHIKR_TIME_KEY)) ?? '07:00');
    })();
  }, []);

  // Persist a change then reschedule everything. When enabling, make sure we
  // have OS permission first.
  const apply = async (enabling: boolean) => {
    if (enabling) await requestNotificationPermissions();
    await scheduleAllNotifications();
  };

  const toggleMaster = async (v: boolean) => {
    setMaster(v);
    await AsyncStorage.setItem(masterKey, String(v));
    await apply(v);
  };

  const togglePrayer = async (key: PrayerKey, v: boolean) => {
    setPrayers((prev) => ({ ...prev, [key]: v }));
    await AsyncStorage.setItem(prayerKey(key), String(v));
    await apply(v);
  };

  const toggleHadith = async (v: boolean) => {
    setHadith(v);
    await AsyncStorage.setItem(hadithKey, String(v));
    await apply(v);
  };

  const pickTime = async (t: string) => {
    setHadithTime(t);
    await AsyncStorage.setItem(HADITH_TIME_KEY, t);
    await scheduleAllNotifications();
  };

  const toggleDhikr = async (v: boolean) => {
    setDhikr(v);
    await AsyncStorage.setItem(dhikrKey, String(v));
    await apply(v);
  };

  const pickDhikrTime = async (t: string) => {
    setDhikrTime(t);
    await AsyncStorage.setItem(DHIKR_TIME_KEY, t);
    await scheduleAllNotifications();
  };

  const disabled = !master;

  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerStyle={{ paddingBottom: 32 }}>
      <Text className="text-sm text-gray-500 text-center py-4 font-sans">
        Prayer reminders and daily hadith
      </Text>

      {/* Master switch */}
      <View className="bg-white rounded-2xl mx-4 mb-3 p-4 border border-gray-100">
        <View className="flex-row items-center justify-between">
          <Text className="font-sans-semibold text-base text-gray-900">
            Enable Notifications
          </Text>
          <Switch
            value={master}
            onValueChange={toggleMaster}
            trackColor={{ false: '#E5E7EB', true: '#0F766E' }}
            thumbColor="white"
          />
        </View>
      </View>

      {/* Prayer reminders */}
      <Text className="text-xs font-sans-semibold text-gray-500 uppercase tracking-wider px-4 pt-2 pb-2">
        Prayer Reminders
      </Text>
      <View
        className="bg-white rounded-2xl mx-4 mb-3 border border-gray-100"
        style={{ opacity: disabled ? 0.4 : 1 }}
        pointerEvents={disabled ? 'none' : 'auto'}
      >
        {PRAYERS.map((p, i) => (
          <View
            key={p.key}
            className={`flex-row items-center justify-between px-4 py-3.5 ${
              i < PRAYERS.length - 1 ? 'border-b border-gray-100' : ''
            }`}
          >
            <Text className="font-sans-medium text-base text-gray-900">{p.label}</Text>
            <Switch
              value={prayers[p.key]}
              onValueChange={(v) => togglePrayer(p.key, v)}
              trackColor={{ false: '#E5E7EB', true: '#0F766E' }}
              thumbColor="white"
            />
          </View>
        ))}
      </View>

      {/* Daily Hadith */}
      <Text className="text-xs font-sans-semibold text-gray-500 uppercase tracking-wider px-4 pt-2 pb-2">
        Daily Hadith
      </Text>
      <View
        className="bg-white rounded-2xl mx-4 mb-3 p-4 border border-gray-100"
        style={{ opacity: disabled ? 0.4 : 1 }}
        pointerEvents={disabled ? 'none' : 'auto'}
      >
        <View className="flex-row items-center justify-between">
          <Text className="font-sans-medium text-base text-gray-900">
            Daily Hadith Reminder
          </Text>
          <Switch
            value={hadith}
            onValueChange={toggleHadith}
            trackColor={{ false: '#E5E7EB', true: '#0F766E' }}
            thumbColor="white"
          />
        </View>
        {hadith && (
          <View className="mt-3 pt-3 border-t border-gray-100">
            <Text className="font-sans-medium text-sm text-gray-700 mb-1 text-center">
              Reminder time
            </Text>
            <TimePicker value={hadithTime} onChange={pickTime} />
          </View>
        )}
      </View>

      {/* Dhikr & Tasbih */}
      <Text className="text-xs font-sans-semibold text-gray-500 uppercase tracking-wider px-4 pt-2 pb-2">
        Dhikr & Tasbih
      </Text>
      <View
        className="bg-white rounded-2xl mx-4 mb-3 p-4 border border-gray-100"
        style={{ opacity: disabled ? 0.4 : 1 }}
        pointerEvents={disabled ? 'none' : 'auto'}
      >
        <View className="flex-row items-center justify-between">
          <Text className="font-sans-medium text-base text-gray-900">
            Daily Dhikr Reminder
          </Text>
          <Switch
            value={dhikr}
            onValueChange={toggleDhikr}
            trackColor={{ false: '#E5E7EB', true: '#0F766E' }}
            thumbColor="white"
          />
        </View>
        {dhikr && (
          <View className="mt-3 pt-3 border-t border-gray-100">
            <Text className="font-sans-medium text-sm text-gray-700 mb-1 text-center">
              Reminder time
            </Text>
            <TimePicker value={dhikrTime} onChange={pickDhikrTime} />
          </View>
        )}
      </View>

      {/* Note */}
      <View className="bg-amber-50 border border-amber-200 rounded-2xl mx-4 p-4 mt-2">
        <Text className="text-sm text-amber-800 font-sans">
          Prayer reminders use your saved location and calculation method.
          Notifications require a development build — they do not fire in Expo Go.
        </Text>
      </View>
    </ScrollView>
  );
}
