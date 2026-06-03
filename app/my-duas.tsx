import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PremiumPaywall } from '../src/components/PremiumPaywall';
import { usePremium } from '../src/hooks/usePremium';
import { useTheme } from '../src/lib/theme-context';

const STORAGE_KEY = 'my-duas-v1';

type MyDua = {
  id: string;
  title: string;
  text: string;
  createdAt: number;
};

export default function MyDuasScreen() {
  const { theme } = useTheme();
  const { isPremium } = usePremium();
  const insets = useSafeAreaInsets();
  const [duas, setDuas] = useState<MyDua[]>([]);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newText, setNewText] = useState('');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) setDuas(JSON.parse(raw) as MyDua[]);
    });
  }, []);

  const persist = useCallback((updated: MyDua[]) => {
    setDuas(updated);
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }, []);

  const handleAdd = () => {
    const title = newTitle.trim() || 'My Dua';
    const text = newText.trim();
    if (!text && !newTitle.trim()) return;
    const dua: MyDua = { id: Date.now().toString(), title, text, createdAt: Date.now() };
    persist([dua, ...duas]);
    setNewTitle('');
    setNewText('');
    setShowAddModal(false);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Dua', 'Remove this dua from your list?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => persist(duas.filter((d) => d.id !== id)) },
    ]);
  };

  if (!isPremium) {
    return (
      <>
        <Stack.Screen options={{ title: 'My Duas' }} />
        <View style={{ flex: 1, backgroundColor: theme.background, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Ionicons name="lock-closed-outline" size={48} color={theme.textMuted} />
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 18, color: theme.text, marginTop: 16, marginBottom: 8, textAlign: 'center' }}>
            Premium Feature
          </Text>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: theme.textMuted, textAlign: 'center', marginBottom: 24, lineHeight: 22 }}>
            Save your personal duas and dhikr for daily reminders. Upgrade to Premium to unlock.
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
      <Stack.Screen
        options={{
          title: 'My Duas',
          headerRight: () => (
            <TouchableOpacity onPress={() => setShowAddModal(true)} style={{ marginRight: 4 }} hitSlop={12}>
              <Ionicons name="add" size={26} color={theme.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      <FlatList
        style={{ flex: 1, backgroundColor: theme.background }}
        data={duas}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, flexGrow: 1 }}
        ListEmptyComponent={
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 }}>
            <Ionicons name="heart-outline" size={56} color={theme.textMuted} />
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 15, color: theme.textMuted, marginTop: 16, textAlign: 'center', lineHeight: 24 }}>
              Add your personal duas and dhikr here
            </Text>
            <TouchableOpacity
              onPress={() => setShowAddModal(true)}
              style={{ marginTop: 20, backgroundColor: theme.primary, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 20 }}
            >
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: 'white' }}>Add First Dua</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <View
            style={{
              backgroundColor: theme.card,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: theme.border,
              marginBottom: 12,
              padding: 16,
              flexDirection: 'row',
              alignItems: 'flex-start',
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 15, color: theme.text, marginBottom: 6 }}>
                {item.title}
              </Text>
              {!!item.text && (
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: theme.textSecondary, lineHeight: 22 }}>
                  {item.text}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={() => handleDelete(item.id)} style={{ padding: 6, marginLeft: 8 }} hitSlop={8}>
              <Ionicons name="trash-outline" size={20} color={theme.textMuted} />
            </TouchableOpacity>
          </View>
        )}
      />

      <Modal visible={showAddModal} animationType="slide" transparent onRequestClose={() => setShowAddModal(false)}>
        <KeyboardAvoidingView
          style={{ flex: 1, justifyContent: 'flex-end' }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View
            style={{
              backgroundColor: theme.card,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
              paddingBottom: insets.bottom + 24,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ flex: 1, fontFamily: 'Inter_700Bold', fontSize: 20, color: theme.text }}>New Dua</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)} hitSlop={12}>
                <Ionicons name="close" size={22} color={theme.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: theme.textMuted, marginBottom: 6 }}>Title</Text>
            <TextInput
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="e.g. Dua for protection"
              placeholderTextColor={theme.textMuted}
              style={{
                borderWidth: 1, borderColor: theme.border, borderRadius: 10, padding: 12,
                fontFamily: 'Inter_400Regular', fontSize: 15, color: theme.text,
                backgroundColor: theme.surface, marginBottom: 16,
              }}
            />
            <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: theme.textMuted, marginBottom: 6 }}>Dua Text</Text>
            <TextInput
              value={newText}
              onChangeText={setNewText}
              placeholder="Enter Arabic or transliteration..."
              placeholderTextColor={theme.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={{
                borderWidth: 1, borderColor: theme.border, borderRadius: 10, padding: 12,
                fontFamily: 'Inter_400Regular', fontSize: 15, color: theme.text,
                backgroundColor: theme.surface, marginBottom: 20, minHeight: 100,
              }}
            />
            <TouchableOpacity
              onPress={handleAdd}
              style={{ backgroundColor: theme.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}
            >
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 15, color: 'white' }}>Save Dua</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}
