import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
  type ViewToken,
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

const HADITH_TIME_KEY = 'hadith-notification-time';
const DHIKR_TIME_KEY = 'dhikr-notification-time';

// ─── Scroll-wheel time picker ─────────────────────────────────────────────────

const ITEM_HEIGHT = 40;
const VISIBLE_ITEMS = 3; // one selected, one above, one below

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

function WheelColumn({
  items,
  selected,
  onSelect,
}: {
  items: string[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  const listRef = useRef<FlatList<string>>(null);

  // Scroll to selected item on mount / when selected changes externally.
  useEffect(() => {
    const idx = items.indexOf(selected);
    if (idx >= 0) {
      const timer = setTimeout(() => {
        listRef.current?.scrollToOffset({ offset: idx * ITEM_HEIGHT, animated: false });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [selected, items]);

  const handleViewableChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0) {
        const middle = viewableItems[Math.floor(viewableItems.length / 2)];
        if (middle?.item) onSelect(middle.item as string);
      }
    },
  ).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 80,
  }).current;

  const initialIndex = items.indexOf(selected);

  return (
    <View
      style={{
        width: 64,
        height: ITEM_HEIGHT * VISIBLE_ITEMS,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Selection highlight behind the centre row */}
      <View
        style={{
          position: 'absolute',
          top: ITEM_HEIGHT,
          left: 4,
          right: 4,
          height: ITEM_HEIGHT,
          backgroundColor: '#F0FDF4',
          borderRadius: 8,
          borderWidth: 1,
          borderColor: '#0F766E',
          zIndex: 0,
        }}
        pointerEvents="none"
      />
      <FlatList
        ref={listRef}
        data={items}
        keyExtractor={(item) => item}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        contentContainerStyle={{
          paddingVertical: ITEM_HEIGHT, // one-item padding top and bottom
        }}
        onViewableItemsChanged={handleViewableChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_data, index) => ({
          length: ITEM_HEIGHT,
          offset: ITEM_HEIGHT * index + ITEM_HEIGHT, // +ITEM_HEIGHT for top padding
          index,
        })}
        initialScrollIndex={initialIndex >= 0 ? initialIndex : 0}
        renderItem={({ item }) => {
          const isSelected = item === selected;
          return (
            <TouchableOpacity
              style={{
                height: ITEM_HEIGHT,
                justifyContent: 'center',
                alignItems: 'center',
              }}
              onPress={() => {
                const idx = items.indexOf(item);
                listRef.current?.scrollToOffset({ offset: idx * ITEM_HEIGHT, animated: true });
                onSelect(item);
              }}
              activeOpacity={0.7}
            >
              <Text
                style={{
                  fontFamily: isSelected ? 'Inter_600SemiBold' : 'Inter_400Regular',
                  fontSize: isSelected ? 22 : 17,
                  color: isSelected ? '#0F766E' : '#6B7280',
                }}
              >
                {item}
              </Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

/** Parse an "HH:MM" string and return { hour, minute } as padded strings. */
function parseTime(t: string): { hour: string; minute: string } {
  const [h = '08', m = '00'] = t.split(':');
  // Snap minute to nearest 5-minute interval
  const mins = parseInt(m, 10);
  const snapped = MINUTES.reduce((prev, curr) =>
    Math.abs(parseInt(curr, 10) - mins) < Math.abs(parseInt(prev, 10) - mins) ? curr : prev,
  );
  return { hour: h.padStart(2, '0'), minute: snapped };
}

function ScrollWheelTimePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (t: string) => void;
}) {
  const { hour, minute } = parseTime(value);
  const [selHour, setSelHour] = useState(hour);
  const [selMinute, setSelMinute] = useState(minute);

  // Sync internal state when parent value changes (e.g. loaded from storage).
  useEffect(() => {
    const { hour: h, minute: m } = parseTime(value);
    setSelHour(h);
    setSelMinute(m);
  }, [value]);

  const handleHourChange = (h: string) => {
    setSelHour(h);
    onChange(`${h}:${selMinute}`);
  };

  const handleMinuteChange = (m: string) => {
    setSelMinute(m);
    onChange(`${selHour}:${m}`);
  };

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 4,
      }}
    >
      <WheelColumn items={HOURS} selected={selHour} onSelect={handleHourChange} />
      <Text
        style={{
          fontFamily: 'Inter_700Bold',
          fontSize: 26,
          color: '#111827',
          marginHorizontal: 4,
          marginTop: -4,
        }}
      >
        :
      </Text>
      <WheelColumn items={MINUTES} selected={selMinute} onSelect={handleMinuteChange} />
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
            <ScrollWheelTimePicker value={hadithTime} onChange={pickTime} />
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
            <ScrollWheelTimePicker value={dhikrTime} onChange={pickDhikrTime} />
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
