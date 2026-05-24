import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RECITERS, type ReciterId } from '../../lib/quran-audio';

type Props = {
  selectedId: ReciterId;
  onSelect: (id: ReciterId) => void;
};

export default function ReciterDropdown({ selectedId, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const selected = RECITERS.find((r) => r.id === selectedId) ?? RECITERS[0];

  return (
    <>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: '#F9FAFB',
          borderBottomWidth: 1,
          borderBottomColor: '#F3F4F6',
          paddingHorizontal: 16,
          paddingVertical: 10,
        }}
      >
        <Ionicons name="volume-medium-outline" size={18} color="#0F766E" />
        <Text
          style={{
            fontFamily: 'Inter_500Medium',
            fontSize: 14,
            color: '#111827',
            flex: 1,
            marginLeft: 8,
          }}
          numberOfLines={1}
        >
          {selected.name}
        </Text>
        <Ionicons name="chevron-down" size={16} color="#6B7280" />
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Pressable
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.4)',
            }}
            onPress={() => setOpen(false)}
          />
          <View
            style={{
              backgroundColor: 'white',
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              paddingBottom: insets.bottom + 16,
              maxHeight: '60%',
            }}
          >
            <View
              style={{
                paddingHorizontal: 24,
                paddingVertical: 16,
                borderBottomWidth: 1,
                borderBottomColor: '#F3F4F6',
              }}
            >
              <Text
                style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#111827' }}
              >
                Select Reciter
              </Text>
            </View>
            <ScrollView>
              {RECITERS.map((reciter) => (
                <TouchableOpacity
                  key={reciter.id}
                  onPress={() => {
                    onSelect(reciter.id);
                    setOpen(false);
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: 14,
                    paddingHorizontal: 24,
                    borderBottomWidth: 1,
                    borderBottomColor: '#F3F4F6',
                  }}
                >
                  <Text
                    style={{
                      fontFamily:
                        selectedId === reciter.id ? 'Inter_500Medium' : 'Inter_400Regular',
                      fontSize: 15,
                      color: selectedId === reciter.id ? '#0F766E' : '#111827',
                      flex: 1,
                    }}
                  >
                    {reciter.name}
                  </Text>
                  {selectedId === reciter.id && (
                    <Ionicons name="checkmark" size={20} color="#0F766E" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}
