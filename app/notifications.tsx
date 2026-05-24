import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

// ─── Shared card component ───────────────────────────────────────────────────

function NotifCard({
  icon,
  title,
  subtitle,
  toggleLabel,
  value,
  onToggle,
  disabled,
  children,
}: {
  icon: IoniconName;
  title: string;
  subtitle: string;
  toggleLabel: string;
  value: boolean;
  onToggle: (v: boolean) => void;
  disabled: boolean;
  children?: ReactNode;
}) {
  return (
    <View
      className="bg-white rounded-2xl mx-4 mb-3 p-4 border border-gray-100"
      style={{ opacity: disabled ? 0.4 : 1 }}
      pointerEvents={disabled ? 'none' : 'auto'}
    >
      {/* Card header: icon + title + subtitle */}
      <View className="flex-row items-center mb-3">
        <Ionicons name={icon} size={20} color="#0F766E" />
        <View className="ml-3 flex-1">
          <Text className="font-sans-semibold text-base text-gray-900">{title}</Text>
          <Text className="text-xs text-gray-500 font-sans mt-0.5">{subtitle}</Text>
        </View>
      </View>

      {/* Toggle row */}
      <View className="flex-row items-center justify-between">
        <Text className="font-sans-medium text-sm text-gray-700">{toggleLabel}</Text>
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: '#E5E7EB', true: '#0F766E' }}
          thumbColor="white"
        />
      </View>

      {/* Optional extra content (e.g. time picker on Jummah card) */}
      {children}
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const [master, setMaster] = useState(true);
  const [hadith, setHadith] = useState(false);
  const [prayer, setPrayer] = useState(false);
  const [jummah, setJummah] = useState(true);
  const [jummahTime, setJummahTime] = useState('12:00');
  const [quran, setQuran] = useState(false);
  const [tasbih, setTasbih] = useState(false);
  const [duas, setDuas] = useState(false);

  useEffect(() => {
    (async () => {
      const loadBool = async (key: string, def: boolean): Promise<boolean> => {
        const v = await AsyncStorage.getItem(key);
        return v !== null ? v === 'true' : def;
      };

      const [m, h, p, j, q, t, d] = await Promise.all([
        loadBool('notif-master', true),
        loadBool('notif-hadith', false),
        loadBool('notif-prayer', false),
        loadBool('notif-jummah', true),
        loadBool('notif-quran', false),
        loadBool('notif-tasbih', false),
        loadBool('notif-duas', false),
      ]);

      const jt = await AsyncStorage.getItem('notif-jummah-time');

      setMaster(m);
      setHadith(h);
      setPrayer(p);
      setJummah(j);
      setJummahTime(jt ?? '12:00');
      setQuran(q);
      setTasbih(t);
      setDuas(d);
    })();
  }, []);

  // Fire-and-forget persist helper.
  function save(key: string, v: boolean) {
    AsyncStorage.setItem(key, String(v));
  }

  const othersDisabled = !master;

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ paddingBottom: 32 }}
    >
      <Text className="text-sm text-gray-500 text-center py-4 font-sans">
        Customize your reminder preferences
      </Text>

      {/* 1 — Master Switch */}
      <NotifCard
        icon="notifications-outline"
        title="Master Switch"
        subtitle="Enable or disable all notifications"
        toggleLabel="Enable Notifications"
        value={master}
        onToggle={(v) => {
          setMaster(v);
          save('notif-master', v);
        }}
        disabled={false}
      />

      {/* 2 — Daily Hadith */}
      <NotifCard
        icon="book-outline"
        title="Daily Hadith"
        subtitle="Receive a daily hadith notification"
        toggleLabel="Enable Daily Hadith"
        value={hadith}
        onToggle={(v) => {
          setHadith(v);
          save('notif-hadith', v);
        }}
        disabled={othersDisabled}
      />

      {/* 3 — Prayer Reminders */}
      <NotifCard
        icon="time-outline"
        title="Prayer Reminders"
        subtitle="Get notified before prayer times"
        toggleLabel="Enable Prayer Reminders"
        value={prayer}
        onToggle={(v) => {
          setPrayer(v);
          save('notif-prayer', v);
        }}
        disabled={othersDisabled}
      />

      {/* 4 — Jummah Reminder (has extra time-picker row) */}
      <NotifCard
        icon="calendar-outline"
        title="Jummah Reminder"
        subtitle="Get reminded about Friday prayer"
        toggleLabel="Enable Jummah Reminder"
        value={jummah}
        onToggle={(v) => {
          setJummah(v);
          save('notif-jummah', v);
        }}
        disabled={othersDisabled}
      >
        <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <Text className="font-sans-medium text-sm text-gray-700">
            Reminder Time (Fridays)
          </Text>
          <TouchableOpacity
            onPress={() => console.log('Time picker — wiring in Week 10')}
            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5"
          >
            <Text className="font-sans-medium text-sm text-gray-900">{jummahTime}</Text>
          </TouchableOpacity>
        </View>
      </NotifCard>

      {/* 5 — Quran Reading Reminder */}
      <NotifCard
        icon="book-outline"
        title="Quran Reading Reminder"
        subtitle="Daily reminder to read Quran"
        toggleLabel="Enable Quran Reminder"
        value={quran}
        onToggle={(v) => {
          setQuran(v);
          save('notif-quran', v);
        }}
        disabled={othersDisabled}
      />

      {/* 6 — Tasbih & Dhikr Reminder */}
      <NotifCard
        icon="sparkles-outline"
        title="Tasbih & Dhikr Reminder"
        subtitle="Daily reminder for remembrance of Allah"
        toggleLabel="Enable Tasbih Reminder"
        value={tasbih}
        onToggle={(v) => {
          setTasbih(v);
          save('notif-tasbih', v);
        }}
        disabled={othersDisabled}
      />

      {/* 7 — Morning & Evening Duas */}
      <NotifCard
        icon="partly-sunny-outline"
        title="Morning & Evening Duas"
        subtitle="Daily reminders for morning and evening supplications"
        toggleLabel="Enable Dua Reminders"
        value={duas}
        onToggle={(v) => {
          setDuas(v);
          save('notif-duas', v);
        }}
        disabled={othersDisabled}
      />

      {/* Permissions note */}
      <View className="bg-amber-50 border border-amber-200 rounded-2xl mx-4 p-4 mt-2">
        <Text className="text-sm text-amber-800 font-sans">
          Note: Notifications require app permissions. Make sure to allow notifications
          when prompted.
        </Text>
      </View>
    </ScrollView>
  );
}
