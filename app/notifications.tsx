import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native';

import {
  PRAYERS,
  hadithKey,
  masterKey,
  prayerKey,
  requestNotificationPermissions,
  scheduleAllNotifications,
  type PrayerKey,
} from '../src/lib/notifications';

const HADITH_TIME_KEY = 'hadith-notification-time';
const TIME_OPTIONS = ['06:00', '07:00', '08:00', '09:00', '20:00'];

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
            <Text className="font-sans-medium text-sm text-gray-700 mb-2">Reminder time</Text>
            <View className="flex-row flex-wrap gap-2">
              {TIME_OPTIONS.map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => pickTime(t)}
                  className={`px-3 py-1.5 rounded-lg ${
                    hadithTime === t ? 'bg-primary' : 'bg-gray-100'
                  }`}
                >
                  <Text
                    className={`text-sm font-sans-medium ${
                      hadithTime === t ? 'text-white' : 'text-gray-700'
                    }`}
                  >
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
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
