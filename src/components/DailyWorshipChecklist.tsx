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
  const [collapsed, setCollapsed] = useState(true);

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

  const cardStyle = {
    backgroundColor: theme.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  };

  const headerRow = (
    <TouchableOpacity
      onPress={() => setCollapsed((c) => !c)}
      activeOpacity={0.7}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
      }}
    >
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
          marginRight: 8,
        }}
      >
        {completedCount} of {WORSHIP_ITEMS.length} completed
      </Text>
      <Ionicons
        name={collapsed ? 'chevron-down-outline' : 'chevron-up-outline'}
        size={20}
        color={theme.primary}
      />
    </TouchableOpacity>
  );

  if (collapsed) {
    return <View style={cardStyle}>{headerRow}</View>;
  }

  return (
    <View style={cardStyle}>
      {headerRow}
      <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
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
    </View>
  );
}
