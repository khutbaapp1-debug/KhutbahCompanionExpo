import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  getPrayerSettings,
  updatePrayerSettings,
  type CalculationMethodKey,
  type HighLatitudeRuleKey,
  type MadhabKey,
} from '../src/lib/prayer-settings';
import type { ThemeMode } from '../src/lib/theme';
import { useTheme } from '../src/lib/theme-context';

// ─── Local types ────────────────────────────────────────────────────────────

type FontSizeKey = 'Small' | 'Default' | 'Large' | 'X-Large';
type OpenModal = 'calcMethod' | 'madhab' | 'highLat' | 'fontSize' | null;
type Option = { label: string; value: string };

// ─── Option data ─────────────────────────────────────────────────────────────

const CALC_OPTIONS: Option[] = [
  { label: 'Muslim World League', value: 'MWL' },
  { label: 'ISNA', value: 'ISNA' },
  { label: 'Egyptian', value: 'Egyptian' },
  { label: 'University of Islamic Sciences, Karachi', value: 'Karachi' },
  { label: 'Umm al-Qura, Makkah', value: 'UmmAlQura' },
  { label: 'Gulf', value: 'Dubai' },
  { label: 'Kuwait', value: 'Kuwait' },
  { label: 'Qatar', value: 'Qatar' },
  { label: 'Singapore', value: 'Singapore' },
  { label: 'Turkey', value: 'Turkey' },
];

const MADHAB_OPTIONS: Option[] = [
  { label: 'Standard (Shafi, Maliki, Hanbali)', value: 'Standard' },
  { label: 'Hanafi', value: 'Hanafi' },
];

const HIGH_LAT_OPTIONS: Option[] = [
  { label: 'Middle of the Night', value: 'MiddleOfTheNight' },
  { label: 'Seventh of the Night', value: 'SeventhOfTheNight' },
  { label: 'Twilight Angle', value: 'TwilightAngle' },
];

const FONT_SIZE_OPTIONS: Option[] = [
  { label: 'Small', value: 'Small' },
  { label: 'Default', value: 'Default' },
  { label: 'Large', value: 'Large' },
  { label: 'X-Large', value: 'X-Large' },
];

const THEME_OPTIONS: { label: string; mode: ThemeMode }[] = [
  { label: 'Light', mode: 'light' },
  { label: 'Dark', mode: 'dark' },
  { label: 'High Contrast', mode: 'high-contrast' },
];

// ─── Shared sub-components ───────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <Text className="text-xs font-sans-semibold text-gray-500 uppercase tracking-wider px-4 pt-6 pb-2">
      {title}
    </Text>
  );
}

// Full-width dropdown trigger: label above, button below.
function DropdownTrigger({
  label,
  displayValue,
  onPress,
}: {
  label: string;
  displayValue: string;
  onPress: () => void;
}) {
  return (
    <View>
      <Text className="text-xs text-gray-500 font-sans mb-1.5">{label}</Text>
      <TouchableOpacity
        onPress={onPress}
        className="flex-row items-center justify-between py-3 px-3 bg-gray-50 rounded-xl border border-gray-200"
      >
        <Text
          className="font-sans-medium text-sm text-gray-900 flex-1 pr-2"
          numberOfLines={1}
        >
          {displayValue}
        </Text>
        <Ionicons name="chevron-down" size={16} color="#6B7280" />
      </TouchableOpacity>
    </View>
  );
}

// Animated bottom-sheet modal for all dropdown selections.
function PickerModal({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: Option[];
  selected: string;
  onSelect: (v: string) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        {/* Tappable backdrop */}
        <Pressable className="absolute inset-0 bg-black/40" onPress={onClose} />

        {/* Bottom sheet */}
        <View
          style={{
            backgroundColor: 'white',
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            paddingBottom: insets.bottom + 16,
            maxHeight: '70%',
          }}
        >
          <View className="px-6 py-4 border-b border-gray-100">
            <Text className="font-sans-semibold text-base text-gray-900">{title}</Text>
          </View>
          <ScrollView>
            {options.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                onPress={() => onSelect(opt.value)}
                className="flex-row items-center justify-between py-4 px-6 border-b border-gray-100"
              >
                <Text
                  className={
                    selected === opt.value
                      ? 'text-base text-primary font-sans-medium flex-1 pr-4'
                      : 'text-base font-sans text-gray-900 flex-1 pr-4'
                  }
                >
                  {opt.label}
                </Text>
                {selected === opt.value && (
                  <Ionicons name="checkmark" size={20} color="#0F766E" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  // Prayer settings state (loaded from prayer-settings storage on mount).
  const [calcMethod, setCalcMethod] = useState<CalculationMethodKey>('MWL');
  const [madhab, setMadhab] = useState<MadhabKey>('Hanafi');
  const [highLat, setHighLat] = useState<HighLatitudeRuleKey>('MiddleOfTheNight');

  // Theme comes from the global ThemeProvider (persisted there).
  const { mode, theme, setTheme } = useTheme();

  // Display preferences (their own AsyncStorage keys).
  const [fontSize, setFontSize] = useState<FontSizeKey>('Default');
  const [reduceMotion, setReduceMotion] = useState(false);

  const [openModal, setOpenModal] = useState<OpenModal>(null);

  useEffect(() => {
    (async () => {
      const s = await getPrayerSettings();
      setCalcMethod(s.calculationMethod);
      setMadhab(s.madhab);
      setHighLat(s.highLatitudeRule);

      const fs = await AsyncStorage.getItem('display-font-size');
      if (fs) setFontSize(fs as FontSizeKey);
      const rm = await AsyncStorage.getItem('display-reduce-motion');
      if (rm !== null) setReduceMotion(rm === 'true');
    })();
  }, []);

  function labelFor(opts: Option[], value: string): string {
    return opts.find((o) => o.value === value)?.label ?? value;
  }

  return (
    <SafeAreaView edges={['bottom']} className="flex-1" style={{ backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>

        {/* ── Section 1 — Display ──────────────────────────────────── */}
        <SectionHeader title="Display" />
        <View className="bg-white rounded-2xl mx-4 border border-gray-100 shadow-sm">
          {/* Font Size */}
          <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-100">
            <Text className="font-sans-medium text-base text-gray-900">Font Size</Text>
            <TouchableOpacity
              onPress={() => setOpenModal('fontSize')}
              className="flex-row items-center bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5"
            >
              <Text className="font-sans-medium text-sm text-gray-900 mr-1.5">{fontSize}</Text>
              <Ionicons name="chevron-down" size={14} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Theme */}
          <View className="px-4 py-4 border-b border-gray-100">
            <View className="flex-row items-center justify-between flex-wrap gap-y-2">
              <Text className="font-sans-medium text-base text-gray-900">Theme</Text>
              <View className="flex-row flex-wrap gap-2">
                {THEME_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.mode}
                    onPress={() => setTheme(opt.mode)}
                    className={`px-2.5 py-1.5 rounded-lg ${
                      mode === opt.mode ? 'bg-primary' : 'bg-gray-100'
                    }`}
                  >
                    <Text
                      className={`text-xs font-sans-medium ${
                        mode === opt.mode ? 'text-white' : 'text-gray-700'
                      }`}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Reduce Motion */}
          <View className="flex-row items-center justify-between px-4 py-4">
            <View className="flex-1 pr-4">
              <Text className="font-sans-medium text-base text-gray-900">Reduce Motion</Text>
              <Text className="text-sm text-gray-500 font-sans mt-0.5">
                Minimise animations and transitions
              </Text>
            </View>
            <Switch
              value={reduceMotion}
              onValueChange={(v) => {
                setReduceMotion(v);
                AsyncStorage.setItem('display-reduce-motion', String(v));
              }}
              trackColor={{ false: '#E5E7EB', true: '#0F766E' }}
              thumbColor="white"
            />
          </View>
        </View>

        {/* ── Section 2 — Prayer Times ─────────────────────────────── */}
        <SectionHeader title="Prayer Times" />
        <View className="bg-white rounded-2xl mx-4 border border-gray-100 shadow-sm px-4">
          {/* Calculation Method */}
          <View className="pt-4 pb-4 border-b border-gray-100">
            <DropdownTrigger
              label="Calculation Method"
              displayValue={labelFor(CALC_OPTIONS, calcMethod)}
              onPress={() => setOpenModal('calcMethod')}
            />
          </View>

          {/* Asr Calculation */}
          <View className="pt-4 pb-4 border-b border-gray-100">
            <DropdownTrigger
              label="Asr Calculation"
              displayValue={labelFor(MADHAB_OPTIONS, madhab)}
              onPress={() => setOpenModal('madhab')}
            />
          </View>

          {/* High Latitude Rule */}
          <View className="pt-4 pb-4">
            <DropdownTrigger
              label="High Latitude Rule"
              displayValue={labelFor(HIGH_LAT_OPTIONS, highLat)}
              onPress={() => setOpenModal('highLat')}
            />
            <Text className="text-xs text-gray-500 mt-2 font-sans">
              ℹ️ For UK users, Middle of the Night is recommended.
            </Text>
          </View>
        </View>

        {/* ── Section 3 — Notifications ────────────────────────────── */}
        <SectionHeader title="Notifications" />
        <Text className="text-xs text-gray-500 px-4 pb-2 font-sans">
          Prayer time reminders and daily content alerts
        </Text>
        <View className="bg-white rounded-2xl mx-4 border border-gray-100 shadow-sm p-4">
          <View className="flex-row items-start">
            <Ionicons name="notifications-outline" size={24} color="#0F766E" />
            <Text className="text-sm text-gray-600 font-sans flex-1 ml-3">
              Manage prayer time reminders, daily hadith, and dua notifications
            </Text>
          </View>
          <TouchableOpacity className="mt-3" onPress={() => router.push('/notifications')}>
            <Text className="text-primary font-sans-medium text-sm">
              Manage Notifications →
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Section 4 — About ────────────────────────────────────── */}
        <SectionHeader title="About" />
        <View className="bg-white rounded-2xl mx-4 border border-gray-100 shadow-sm">
          {/* Version */}
          <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-100">
            <Text className="font-sans-medium text-base text-gray-900">Version</Text>
            <Text className="font-sans text-gray-500">
              {Constants.expoConfig?.version ?? '1.0.0'}
            </Text>
          </View>

          {/* Privacy Policy */}
          <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-100">
            <Text className="font-sans-medium text-base text-gray-900">Privacy Policy</Text>
            <TouchableOpacity
              onPress={() =>
                Linking.openURL('https://khutbah-translate.replit.app/privacy')
              }
            >
              <Text className="text-primary font-sans-medium">View →</Text>
            </TouchableOpacity>
          </View>

          {/* Contact / Data Deletion */}
          <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-100">
            <Text className="font-sans-medium text-base text-gray-900 flex-1 pr-3">
              Contact / Data Deletion
            </Text>
            <TouchableOpacity
              onPress={() => Linking.openURL('mailto:khutba.app1@gmail.com')}
            >
              <Text className="text-primary font-sans-medium text-sm">
                khutba.app1@gmail.com
              </Text>
            </TouchableOpacity>
          </View>

          {/* Rate on Play Store */}
          <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-100">
            <Text className="font-sans-medium text-base text-gray-900">Rate the App</Text>
            <TouchableOpacity
              onPress={() => {
                const pkg = Constants.expoConfig?.android?.package;
                Linking.openURL(
                  pkg
                    ? `https://play.google.com/store/apps/details?id=${pkg}`
                    : 'https://play.google.com/store',
                );
              }}
            >
              <Text className="text-primary font-sans-medium">Play Store →</Text>
            </TouchableOpacity>
          </View>

          {/* Tagline */}
          <View className="py-3 px-4">
            <Text className="text-xs text-gray-400 text-center font-sans">
              Made by Akber Khan in Dubai 🇦🇪
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* ── Dropdown modals (rendered outside ScrollView, still inside SafeAreaView) */}
      <PickerModal
        visible={openModal === 'fontSize'}
        title="Font Size"
        options={FONT_SIZE_OPTIONS}
        selected={fontSize}
        onSelect={(v) => {
          setFontSize(v as FontSizeKey);
          AsyncStorage.setItem('display-font-size', v);
          setOpenModal(null);
        }}
        onClose={() => setOpenModal(null)}
      />
      <PickerModal
        visible={openModal === 'calcMethod'}
        title="Calculation Method"
        options={CALC_OPTIONS}
        selected={calcMethod}
        onSelect={(v) => {
          const key = v as CalculationMethodKey;
          setCalcMethod(key);
          updatePrayerSettings({ calculationMethod: key });
          setOpenModal(null);
        }}
        onClose={() => setOpenModal(null)}
      />
      <PickerModal
        visible={openModal === 'madhab'}
        title="Asr Calculation"
        options={MADHAB_OPTIONS}
        selected={madhab}
        onSelect={(v) => {
          const key = v as MadhabKey;
          setMadhab(key);
          updatePrayerSettings({ madhab: key });
          setOpenModal(null);
        }}
        onClose={() => setOpenModal(null)}
      />
      <PickerModal
        visible={openModal === 'highLat'}
        title="High Latitude Rule"
        options={HIGH_LAT_OPTIONS}
        selected={highLat}
        onSelect={(v) => {
          const key = v as HighLatitudeRuleKey;
          setHighLat(key);
          updatePrayerSettings({ highLatitudeRule: key });
          setOpenModal(null);
        }}
        onClose={() => setOpenModal(null)}
      />
    </SafeAreaView>
  );
}
