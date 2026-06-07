import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { useTheme } from '../lib/theme-context';

const CHECKLIST_KEY_PREFIX = 'daily-worship-checklist-v1-';

const WORSHIP_ITEMS = [
  { id: 'tahajjud',       label: 'Tahajjud prayed (last third of night)' },
  { id: 'morning-adhkar', label: 'Morning Adhkar completed (after Fajr)' },
  { id: 'duha',           label: 'Duha prayer prayed (after sunrise)' },
  { id: 'evening-adhkar', label: 'Evening Adhkar completed (after Asr)' },
  { id: 'istighfar',      label: 'Istighfar ×100' },
  { id: 'salawat',        label: 'Salawat upon the Prophet ﷺ' },
] as const;

function todayKey(): string {
  return new Date().toISOString().split('T')[0] ?? '';
}

export default function DailyWorshipChecklist() {
  const { theme } = useTheme();
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});

  useEffect(() => {
    AsyncStorage.getItem(CHECKLIST_KEY_PREFIX + todayKey()).then((raw) => {
      if (raw) setChecklist(JSON.parse(raw) as Record<string, boolean>);
    });
  }, []);

  const toggleItem = useCallback((id: string) => {
    setChecklist((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      void AsyncStorage.setItem(CHECKLIST_KEY_PREFIX + todayKey(), JSON.stringify(next));
      return next;
    });
  }, []);

  const completedCount = WORSHIP_ITEMS.filter((item) => checklist[item.id]).length;

  return (
    <View
      style={{
        backgroundColor: theme.card,
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: theme.border,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
        <Text
          style={{
            flex: 1,
            fontFamily: 'Inter_600SemiBold',
            fontSize: 16,
            color: theme.text,
          }}
        >
          Today's Worship
        </Text>
        <Text
          style={{
            fontFamily: 'Inter_400Regular',
            fontSize: 13,
            color: theme.textMuted,
          }}
        >
          {completedCount} of {WORSHIP_ITEMS.length} completed
        </Text>
      </View>
      {WORSHIP_ITEMS.map((item, idx) => {
        const checked = !!checklist[item.id];
        const isLast = idx === WORSHIP_ITEMS.length - 1;
        return (
          <TouchableOpacity
            key={item.id}
            onPress={() => toggleItem(item.id)}
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
  );
}
