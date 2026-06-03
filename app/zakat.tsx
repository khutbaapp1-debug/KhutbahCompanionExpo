import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PremiumPaywall } from '../src/components/PremiumPaywall';
import { usePremium } from '../src/hooks/usePremium';
import { useTheme } from '../src/lib/theme-context';

// Nisab based on silver: 612.36g × silver price per gram.
// Hardcoded rate gives ~£350 fallback; updated manually per scholarly guidance.
const SILVER_NISAB_GRAMS = 612.36;
const SILVER_GBP_PER_GRAM = 0.572;
const NISAB = Math.max(
  Math.round(SILVER_NISAB_GRAMS * SILVER_GBP_PER_GRAM),
  350,
);
const ZAKAT_RATE = 0.025;

function parse(s: string): number {
  const n = parseFloat(s.replace(/[^0-9.]/g, ''));
  return isNaN(n) ? 0 : n;
}

function fmt(n: number): string {
  return n.toLocaleString('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2 });
}

export default function ZakatScreen() {
  const { theme } = useTheme();
  const { isPremium } = usePremium();
  const insets = useSafeAreaInsets();
  const [showPaywall, setShowPaywall] = useState(false);

  const [cash, setCash] = useState('');
  const [gold, setGold] = useState('');
  const [silver, setSilver] = useState('');
  const [inventory, setInventory] = useState('');
  const [receivables, setReceivables] = useState('');

  const total = useMemo(
    () => parse(cash) + parse(gold) + parse(silver) + parse(inventory) + parse(receivables),
    [cash, gold, silver, inventory, receivables],
  );

  const aboveNisab = total >= NISAB;
  const zakatDue = aboveNisab ? total * ZAKAT_RATE : 0;

  const fields: { label: string; hint: string; value: string; setter: (v: string) => void }[] = [
    { label: 'Cash & Savings', hint: 'Bank balances, cash at home', value: cash, setter: setCash },
    { label: 'Gold Value', hint: 'Market value of gold you own', value: gold, setter: setGold },
    { label: 'Silver Value', hint: 'Market value of silver you own', value: silver, setter: setSilver },
    { label: 'Business Inventory', hint: 'Stock held for trade', value: inventory, setter: setInventory },
    { label: 'Money Owed to You', hint: 'Debts you expect to recover', value: receivables, setter: setReceivables },
  ];

  if (!isPremium) {
    return (
      <>
        <Stack.Screen options={{ title: 'Zakat Calculator' }} />
        <View style={{ flex: 1, backgroundColor: theme.background, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Ionicons name="lock-closed-outline" size={48} color={theme.textMuted} />
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 18, color: theme.text, marginTop: 16, marginBottom: 8, textAlign: 'center' }}>
            Premium Feature
          </Text>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: theme.textMuted, textAlign: 'center', marginBottom: 24, lineHeight: 22 }}>
            Calculate your Zakat accurately with our step-by-step calculator. Upgrade to Premium to unlock.
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

  return (
    <>
      <Stack.Screen options={{ title: 'Zakat Calculator' }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={{ flex: 1, backgroundColor: theme.background }}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Nisab card */}
          <View style={{ backgroundColor: theme.primaryContainer, borderRadius: 14, padding: 16, marginBottom: 20 }}>
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: theme.primary, marginBottom: 2 }}>
              Nisab Threshold (Silver — 612.36g)
            </Text>
            <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 26, color: theme.primary }}>
              {fmt(NISAB)}
            </Text>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: theme.textMuted, marginTop: 2 }}>
              Zakat is obligatory when total wealth exceeds this amount for one lunar year.
            </Text>
          </View>

          {/* Input fields */}
          {fields.map((f) => (
            <View key={f.label} style={{ marginBottom: 16 }}>
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: theme.text, marginBottom: 2 }}>
                {f.label}
              </Text>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: theme.textMuted, marginBottom: 6 }}>
                {f.hint}
              </Text>
              <View
                style={{
                  flexDirection: 'row', alignItems: 'center',
                  borderWidth: 1, borderColor: theme.border, borderRadius: 10,
                  backgroundColor: theme.surface, paddingHorizontal: 12,
                }}
              >
                <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 16, color: theme.textMuted, marginRight: 4 }}>£</Text>
                <TextInput
                  value={f.value}
                  onChangeText={f.setter}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={theme.textMuted}
                  style={{
                    flex: 1, fontFamily: 'Inter_400Regular', fontSize: 16,
                    color: theme.text, paddingVertical: 12,
                  }}
                />
              </View>
            </View>
          ))}

          <View style={{ height: 1, backgroundColor: theme.border, marginVertical: 8 }} />

          {/* Total */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, marginBottom: 4 }}>
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 15, color: theme.textSecondary }}>Total Zakatable Wealth</Text>
            <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 20, color: theme.text }}>{fmt(total)}</Text>
          </View>

          {/* Nisab status */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20, paddingVertical: 4 }}>
            <Ionicons
              name={aboveNisab ? 'checkmark-circle' : 'close-circle'}
              size={18}
              color={aboveNisab ? '#16A34A' : theme.textMuted}
              style={{ marginRight: 6 }}
            />
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: aboveNisab ? '#16A34A' : theme.textMuted, flex: 1 }}>
              {aboveNisab
                ? 'Above Nisab — Zakat is due'
                : `Below Nisab (${fmt(Math.max(0, NISAB - total))} short) — no Zakat due`}
            </Text>
          </View>

          {/* Zakat due */}
          <View
            style={{
              backgroundColor: aboveNisab ? theme.primary : theme.surface,
              borderRadius: 16, padding: 20, alignItems: 'center',
              borderWidth: aboveNisab ? 0 : 1, borderColor: theme.border,
            }}
          >
            <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 14, color: aboveNisab ? 'rgba(255,255,255,0.85)' : theme.textMuted, marginBottom: 8 }}>
              Zakat Due (2.5%)
            </Text>
            <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 38, color: aboveNisab ? 'white' : theme.textMuted }}>
              {fmt(zakatDue)}
            </Text>
            {aboveNisab && (
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 10, textAlign: 'center', lineHeight: 18 }}>
                SubhanAllah — paying Zakat purifies your wealth and supports those in need.
              </Text>
            )}
          </View>

          {/* Clear */}
          <TouchableOpacity
            onPress={() => { setCash(''); setGold(''); setSilver(''); setInventory(''); setReceivables(''); }}
            style={{ alignItems: 'center', marginTop: 20, paddingVertical: 10 }}
          >
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: theme.textMuted }}>Clear all fields</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
