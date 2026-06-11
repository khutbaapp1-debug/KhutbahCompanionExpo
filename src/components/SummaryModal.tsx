import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import { Component, type ReactNode, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../lib/theme-context';

type Props = {
  visible: boolean;
  onDismiss: () => void;
  summary: string | null;
  actionPoints: string[];
};

// ── Error boundary wrapping modal content ────────────────────────────────────

class SummaryErrorBoundary extends Component<
  { children: ReactNode; onDismiss: () => void },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error): void {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log('[SUMMARY] error boundary caught:', error?.message ?? String(error));
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <View style={{ padding: 32, alignItems: 'center', gap: 16 }}>
          <Text
            style={{
              fontFamily: 'Inter_400Regular',
              fontSize: 15,
              color: '#6B7280',
              textAlign: 'center',
            }}
          >
            Something went wrong — try again
          </Text>
          <TouchableOpacity
            onPress={() => {
              this.setState({ hasError: false });
              this.props.onDismiss();
            }}
            style={{ paddingHorizontal: 24, paddingVertical: 10, backgroundColor: '#0F766E', borderRadius: 10 }}
          >
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: 'white' }}>Close</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

// ── Inner modal content ───────────────────────────────────────────────────────

function SummaryContent({ summary, actionPoints, onDismiss }: Omit<Props, 'visible'>) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const cardRef = useRef<View>(null);
  const [layoutReady, setLayoutReady] = useState(false);
  const [sharing, setSharing] = useState(false);

  const safePoints = Array.isArray(actionPoints) ? actionPoints : [];

  const handleShare = async () => {
    if (!cardRef.current || !layoutReady) return;
    setSharing(true);
    try {
      // Let the layout engine finish before capturing.
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log('[SUMMARY] capturing share card…');
      }
      const uri = await captureRef(cardRef, { format: 'png', quality: 1 });
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log('[SUMMARY] captured uri:', uri);
      }
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Share Khutbah Summary',
      });
    } catch (err) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log('[SUMMARY] share error:', err instanceof Error ? err.message : String(err));
      }
      Alert.alert('Share failed', 'Could not share the summary. Please try again.');
    } finally {
      setSharing(false);
    }
  };

  return (
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

      <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
        {/* Capture target — ref on the inner content View so view-shot gets the full layout */}
        <View
          ref={cardRef}
          onLayout={() => setLayoutReady(true)}
          style={{ backgroundColor: theme.card }}
          collapsable={false}
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

          {safePoints.length > 0 ? (
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
              {safePoints.map((point, i) => (
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
                    {typeof point === 'string' ? point : ''}
                  </Text>
                </View>
              ))}
            </>
          ) : null}
        </View>

        {(summary || safePoints.length > 0) && (
          <TouchableOpacity
            onPress={() => void handleShare()}
            disabled={!layoutReady || sharing}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              marginTop: 12,
              backgroundColor: theme.primary,
              borderRadius: 14,
              paddingVertical: 14,
              opacity: !layoutReady || sharing ? 0.6 : 1,
            }}
          >
            {sharing ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons name="share-outline" size={18} color="white" />
            )}
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 15, color: 'white' }}>
              {sharing ? 'Sharing…' : 'Share Summary'}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

// ── Public export ─────────────────────────────────────────────────────────────

export function SummaryModal({ visible, onDismiss, summary, actionPoints }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <SummaryErrorBoundary onDismiss={onDismiss}>
          <SummaryContent
            summary={summary}
            actionPoints={actionPoints}
            onDismiss={onDismiss}
          />
        </SummaryErrorBoundary>
      </View>
    </Modal>
  );
}
