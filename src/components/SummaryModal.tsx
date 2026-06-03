import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Share,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../lib/theme-context';

type Props = {
  visible: boolean;
  onDismiss: () => void;
  isLoading: boolean;
  summary: string | null;
  actionPoints: string[];
};

export function SummaryModal({ visible, onDismiss, isLoading, summary, actionPoints }: Props) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const handleShare = async () => {
    if (!summary && actionPoints.length === 0) return;
    const lines: string[] = ['📋 Khutbah Summary', ''];
    if (summary) lines.push(summary, '');
    if (actionPoints.length > 0) {
      lines.push('📌 Action Points');
      actionPoints.forEach((p, i) => lines.push(`${i + 1}. ${p}`));
    }
    await Share.share({ message: lines.join('\n') });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <View
          style={{
            backgroundColor: theme.card,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            maxHeight: '82%',
            paddingBottom: insets.bottom + 16,
          }}
        >
          {/* Handle bar */}
          <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: theme.border }} />
          </View>

          {/* Header row */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 20,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: theme.border,
            }}
          >
            <Ionicons
              name="document-text-outline"
              size={20}
              color={theme.primary}
              style={{ marginRight: 10 }}
            />
            <Text style={{ flex: 1, fontFamily: 'Inter_700Bold', fontSize: 18, color: theme.text }}>
              Khutbah Summary
            </Text>
            <TouchableOpacity onPress={onDismiss} hitSlop={12} style={{ padding: 4 }}>
              <Ionicons name="close" size={22} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <View style={{ alignItems: 'center', justifyContent: 'center', padding: 52 }}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text
                style={{
                  fontFamily: 'Inter_400Regular',
                  fontSize: 14,
                  color: theme.textMuted,
                  marginTop: 16,
                }}
              >
                Generating summary…
              </Text>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={{ padding: 20 }}
              showsVerticalScrollIndicator={false}
            >
              {summary ? (
                <>
                  <Text
                    style={{
                      fontFamily: 'Inter_600SemiBold',
                      fontSize: 12,
                      color: theme.primary,
                      textTransform: 'uppercase',
                      letterSpacing: 0.8,
                      marginBottom: 10,
                    }}
                  >
                    Summary &amp; Key Themes
                  </Text>
                  <Text
                    style={{
                      fontFamily: 'Inter_400Regular',
                      fontSize: 15,
                      color: theme.text,
                      lineHeight: 24,
                      marginBottom: 22,
                    }}
                  >
                    {summary}
                  </Text>
                </>
              ) : null}

              {actionPoints.length > 0 ? (
                <>
                  <Text
                    style={{
                      fontFamily: 'Inter_600SemiBold',
                      fontSize: 12,
                      color: theme.primary,
                      textTransform: 'uppercase',
                      letterSpacing: 0.8,
                      marginBottom: 12,
                    }}
                  >
                    Action Points
                  </Text>
                  {actionPoints.map((point, i) => (
                    <View
                      key={i}
                      style={{ flexDirection: 'row', marginBottom: 12, alignItems: 'flex-start' }}
                    >
                      <View
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 11,
                          backgroundColor: theme.primaryContainer,
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: 10,
                          marginTop: 1,
                          flexShrink: 0,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: 'Inter_700Bold',
                            fontSize: 11,
                            color: theme.primary,
                          }}
                        >
                          {i + 1}
                        </Text>
                      </View>
                      <Text
                        style={{
                          flex: 1,
                          fontFamily: 'Inter_400Regular',
                          fontSize: 15,
                          color: theme.text,
                          lineHeight: 24,
                        }}
                      >
                        {point}
                      </Text>
                    </View>
                  ))}
                </>
              ) : null}

              {(summary || actionPoints.length > 0) && (
                <TouchableOpacity
                  onPress={() => void handleShare()}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    marginTop: 12,
                    backgroundColor: theme.primary,
                    borderRadius: 14,
                    paddingVertical: 14,
                  }}
                >
                  <Ionicons name="share-outline" size={18} color="white" />
                  <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 15, color: 'white' }}>
                    Share Summary
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}
