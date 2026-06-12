import { Ionicons } from '@expo/vector-icons';
import { Component, type ReactNode, useState } from 'react';
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
import type { SummarySchema } from '../lib/summary-types';

type Props = {
  visible: boolean;
  onDismiss: () => void;
  summaryData: SummarySchema | null;
  onRetry: () => void;
  recordingDate?: Date;
};

// Returns a flat array of non-empty strings from a string, string[], or unknown.
function toLines(value: unknown): string[] {
  if (typeof value === 'string' && value.trim()) return [value];
  if (Array.isArray(value)) {
    return value.filter((s): s is string => typeof s === 'string' && s.trim().length > 0);
  }
  return [];
}

// Picks the lead paragraph from the normalized data.
function toLead(data: SummarySchema): string {
  if (typeof data.shortSummary === 'string' && data.shortSummary.trim()) {
    return data.shortSummary;
  }
  return '';
}

// Formats a Date as "Friday 12 June 2026".
function formatDate(date: Date): string {
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return `${DAYS[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

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

function SummaryContent({ summaryData, onDismiss, onRetry, recordingDate }: Omit<Props, 'visible'>) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [sharing, setSharing] = useState(false);

  const dateLabel = formatDate(recordingDate ?? new Date());

  const lead = summaryData ? toLead(summaryData) : '';
  const themes = summaryData ? toLines(summaryData.mainThemes) : [];
  // action points: prefer actionPoints (legacy + explicit), fall back to keyPoints
  const points = summaryData
    ? toLines(summaryData.actionPoints).length > 0
      ? toLines(summaryData.actionPoints)
      : toLines(summaryData.keyPoints)
    : [];
  const detailed =
    summaryData && typeof summaryData.detailedSummary === 'string'
      ? summaryData.detailedSummary.trim()
      : '';

  const hasSummary = Boolean(lead || themes.length > 0 || points.length > 0);

  const handleShare = async () => {
    setSharing(true);
    try {
      const lines: string[] = [`Khutbah Summary\n${dateLabel}`];

      if (lead) {
        lines.push(`\nSUMMARY\n${lead}`);
      }
      if (themes.length > 0) {
        lines.push(`\nMAIN THEMES\n${themes.map((t) => `• ${t}`).join('\n')}`);
      }
      if (points.length > 0) {
        lines.push(`\nACTION POINTS\n${points.map((p, i) => `${i + 1}. ${p}`).join('\n')}`);
      }

      await Share.share({ message: lines.join('\n') });
    } catch (err) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log('[SUMMARY] share error:', err instanceof Error ? err.message : String(err));
      }
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
        maxHeight: '90%',
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
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 18, color: theme.text }}>
            Khutbah Summary
          </Text>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: theme.textMuted, marginTop: 1 }}>
            {dateLabel}
          </Text>
        </View>
        <TouchableOpacity onPress={onDismiss} hitSlop={12} style={{ padding: 4 }}>
          <Ionicons name="close" size={22} color={theme.textMuted} />
        </TouchableOpacity>
      </View>

      {/* ── Explicit error state: data arrived but all fields are empty ── */}
      {summaryData !== null && !hasSummary ? (
        <View style={{ padding: 32, alignItems: 'center', gap: 16 }}>
          <Ionicons name="alert-circle-outline" size={40} color={theme.textMuted} />
          <Text
            style={{
              fontFamily: 'Inter_400Regular',
              fontSize: 15,
              color: theme.textMuted,
              textAlign: 'center',
              lineHeight: 22,
            }}
          >
            Summary could not be loaded — tap to retry
          </Text>
          <TouchableOpacity
            onPress={() => {
              onRetry();
              onDismiss();
            }}
            style={{
              backgroundColor: theme.primary,
              borderRadius: 12,
              paddingHorizontal: 28,
              paddingVertical: 12,
            }}
          >
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#FFFFFF' }}>
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {(summaryData === null || hasSummary) && (
        <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>

          {lead ? (
            <>
              <Text
                style={{
                  fontFamily: 'Inter_600SemiBold',
                  fontSize: 12,
                  color: theme.primary,
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                  marginBottom: 8,
                }}
              >
                Summary
              </Text>
              <Text
                style={{
                  fontFamily: 'Inter_400Regular',
                  fontSize: 15,
                  color: theme.text,
                  lineHeight: 24,
                  marginBottom: 20,
                }}
              >
                {lead}
              </Text>
            </>
          ) : null}

          {themes.length > 0 ? (
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
                Main Themes
              </Text>
              {themes.map((theme_item, i) => (
                <View
                  key={i}
                  style={{ flexDirection: 'row', marginBottom: 8, alignItems: 'flex-start' }}
                >
                  <Text
                    style={{
                      fontFamily: 'Inter_400Regular',
                      fontSize: 15,
                      color: theme.primary,
                      marginRight: 8,
                      lineHeight: 24,
                    }}
                  >
                    •
                  </Text>
                  <Text
                    style={{
                      flex: 1,
                      fontFamily: 'Inter_400Regular',
                      fontSize: 15,
                      color: theme.text,
                      lineHeight: 24,
                    }}
                  >
                    {theme_item}
                  </Text>
                </View>
              ))}
              <View style={{ marginBottom: 12 }} />
            </>
          ) : null}

          {points.length > 0 ? (
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
                Action Points
              </Text>
              {points.map((point, i) => (
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
                      style={{ fontFamily: 'Inter_700Bold', fontSize: 11, color: theme.primary }}
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

          {/* ── Detailed summary (in-app only) ─────────────────────────── */}
          {detailed ? (
            <View
              style={{
                marginTop: 4,
                paddingTop: 16,
                borderTopWidth: 1,
                borderTopColor: theme.border,
              }}
            >
              <Text
                style={{
                  fontFamily: 'Inter_600SemiBold',
                  fontSize: 12,
                  color: theme.primary,
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                  marginBottom: 8,
                }}
              >
                Detailed Summary
              </Text>
              <Text
                style={{
                  fontFamily: 'Inter_400Regular',
                  fontSize: 15,
                  color: theme.text,
                  lineHeight: 24,
                }}
              >
                {detailed}
              </Text>
            </View>
          ) : null}

          {/* ── Share button ────────────────────────────────────────────── */}
          {hasSummary && (
            <TouchableOpacity
              onPress={() => void handleShare()}
              disabled={sharing}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                marginTop: 20,
                backgroundColor: theme.primary,
                borderRadius: 14,
                paddingVertical: 14,
                opacity: sharing ? 0.6 : 1,
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
      )}
    </View>
  );
}

// ── Public export ─────────────────────────────────────────────────────────────

export function SummaryModal({ visible, onDismiss, summaryData, onRetry, recordingDate }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <SummaryErrorBoundary onDismiss={onDismiss}>
          <SummaryContent
            summaryData={summaryData}
            onDismiss={onDismiss}
            onRetry={onRetry}
            recordingDate={recordingDate}
          />
        </SummaryErrorBoundary>
      </View>
    </Modal>
  );
}
