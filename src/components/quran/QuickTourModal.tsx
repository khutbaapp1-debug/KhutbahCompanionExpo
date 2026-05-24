import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Modal, Pressable, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

const TIPS: { icon: IoniconName; title: string; body: string }[] = [
  {
    icon: 'hand-right-outline',
    title: 'Tap a verse number',
    body: 'Plays the recitation and shows the translation for that verse.',
  },
  {
    icon: 'bookmark-outline',
    title: 'Long-press to bookmark',
    body: "Hold a verse number to save your reading position. You'll return to that exact verse next time.",
  },
  {
    icon: 'volume-high-outline',
    title: 'Choose your reciter',
    body: 'Use the dropdown at the top of any surah to switch between reciters.',
  },
  {
    icon: 'swap-horizontal-outline',
    title: 'Swipe between surahs',
    body: 'Swipe left for the next surah, swipe right for the previous one.',
  },
  {
    icon: 'list-outline',
    title: 'Switch views',
    body: 'Use the Page / Detailed toggle to switch between flowing Mushaf-style reading and verse-by-verse with translation.',
  },
];

type Props = {
  visible: boolean;
  onDismiss: () => void;
};

export default function QuickTourModal({ visible, onDismiss }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
          }}
          onPress={onDismiss}
        />
        <View
          style={{
            backgroundColor: 'white',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingBottom: insets.bottom + 16,
            maxHeight: '88%',
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 24,
              paddingTop: 24,
              paddingBottom: 6,
            }}
          >
            <Ionicons name="book-outline" size={24} color="#0F766E" />
            <Text
              style={{
                fontFamily: 'Inter_700Bold',
                fontSize: 18,
                color: '#111827',
                marginLeft: 10,
                flex: 1,
              }}
            >
              Quick Tour: Qur'an Reader
            </Text>
          </View>
          <Text
            style={{
              fontFamily: 'Inter_400Regular',
              fontSize: 13,
              color: '#6B7280',
              paddingHorizontal: 24,
              paddingBottom: 18,
            }}
          >
            A few quick tips to help you get the most out of your reading experience.
          </Text>

          {/* Tips */}
          <ScrollView showsVerticalScrollIndicator={false}>
            {TIPS.map((tip) => (
              <View
                key={tip.title}
                style={{ flexDirection: 'row', paddingHorizontal: 24, marginBottom: 20 }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: '#F0FDFA',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 14,
                  }}
                >
                  <Ionicons name={tip.icon} size={20} color="#0F766E" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontFamily: 'Inter_600SemiBold',
                      fontSize: 14,
                      color: '#111827',
                    }}
                  >
                    {tip.title}
                  </Text>
                  <Text
                    style={{
                      fontFamily: 'Inter_400Regular',
                      fontSize: 13,
                      color: '#6B7280',
                      marginTop: 3,
                      lineHeight: 19,
                    }}
                  >
                    {tip.body}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Got it */}
          <TouchableOpacity
            onPress={onDismiss}
            style={{
              marginHorizontal: 24,
              marginTop: 8,
              backgroundColor: '#0F766E',
              borderRadius: 12,
              paddingVertical: 14,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16, color: 'white' }}>
              Got it
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
