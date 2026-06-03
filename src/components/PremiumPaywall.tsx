import Purchases, { PurchasesPackage } from 'react-native-purchases';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme-context';

type Props = {
  visible: boolean;
  onDismiss: () => void;
};

const FEATURES: { icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { icon: 'book-outline', label: 'All duas categories' },
  { icon: 'infinite', label: 'Unlimited dhikr options' },
  { icon: 'bookmark', label: 'Quran verse bookmarks' },
  { icon: 'time-outline', label: 'Translation history' },
  { icon: 'language', label: 'Multilingual translation' },
];

export function PremiumPaywall({ visible, onDismiss }: Props) {
  const { theme } = useTheme();
  const [pkg, setPkg] = useState<PurchasesPackage | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setPkg(null);
    Purchases.getOfferings()
      .then((offerings) => {
        const monthly =
          offerings.current?.monthly ??
          offerings.current?.availablePackages[0] ??
          null;
        setPkg(monthly);
      })
      .catch(() => setPkg(null));
  }, [visible]);

  const handleSubscribe = async () => {
    if (!pkg) return;
    setPurchasing(true);
    try {
      await Purchases.purchasePackage(pkg);
      onDismiss();
    } catch (e: unknown) {
      if ((e as { userCancelled?: boolean }).userCancelled) {
        // user tapped back — silent
      } else {
        Alert.alert('Purchase failed', 'Please try again or restore your purchases.');
      }
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const info = await Purchases.restorePurchases();
      if (info.entitlements.active['premium']) {
        Alert.alert('Restored', 'Premium access restored successfully.');
        onDismiss();
      } else {
        Alert.alert('No purchases found', 'No previous premium subscription was found for this account.');
      }
    } catch {
      Alert.alert('Restore failed', 'Please check your connection and try again.');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
    >
      <View
        style={{
          flex: 1,
          justifyContent: 'flex-end',
          backgroundColor: 'rgba(0,0,0,0.55)',
        }}
      >
        <View
          style={{
            backgroundColor: theme.card,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingHorizontal: 24,
            paddingTop: 16,
            paddingBottom: 32,
          }}
        >
          {/* Dismiss */}
          <TouchableOpacity
            onPress={onDismiss}
            style={{ alignSelf: 'flex-end', padding: 4, marginBottom: 4 }}
            accessibilityLabel="Close"
          >
            <Ionicons name="close" size={22} color={theme.textMuted} />
          </TouchableOpacity>

          {/* Crown icon */}
          <View style={{ alignItems: 'center', marginBottom: 12 }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: theme.primaryContainer,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="star" size={32} color={theme.primary} />
            </View>
          </View>

          {/* Headings */}
          <Text
            style={{
              fontFamily: 'Inter_700Bold',
              fontSize: 24,
              color: theme.text,
              textAlign: 'center',
              marginBottom: 4,
            }}
          >
            Upgrade to Premium
          </Text>
          <Text
            style={{
              fontFamily: 'Inter_400Regular',
              fontSize: 14,
              color: theme.textMuted,
              textAlign: 'center',
              marginBottom: 20,
              lineHeight: 20,
            }}
          >
            Unlock all features and support the development of Khutbah Companion.
          </Text>

          {/* Feature list */}
          {FEATURES.map((f) => (
            <View
              key={f.label}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <Ionicons
                name={f.icon}
                size={20}
                color={theme.primary}
                style={{ marginRight: 12, width: 22 }}
              />
              <Text
                style={{
                  fontFamily: 'Inter_400Regular',
                  fontSize: 15,
                  color: theme.text,
                }}
              >
                {f.label}
              </Text>
            </View>
          ))}

          {/* Price */}
          <Text
            style={{
              fontFamily: 'Inter_600SemiBold',
              fontSize: 16,
              color: theme.textSecondary,
              textAlign: 'center',
              marginTop: 8,
              marginBottom: 16,
            }}
          >
            {pkg?.product.priceString ?? '£2.99'} / month
          </Text>

          {/* Subscribe button */}
          <TouchableOpacity
            onPress={() => void handleSubscribe()}
            disabled={purchasing || restoring}
            style={{
              backgroundColor: theme.primary,
              borderRadius: 14,
              paddingVertical: 16,
              alignItems: 'center',
              marginBottom: 12,
              opacity: purchasing || restoring ? 0.7 : 1,
            }}
          >
            {purchasing ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text
                style={{
                  fontFamily: 'Inter_600SemiBold',
                  fontSize: 16,
                  color: 'white',
                }}
              >
                Subscribe – {pkg?.product.priceString ?? '£2.99'}/month
              </Text>
            )}
          </TouchableOpacity>

          {/* Restore */}
          <TouchableOpacity
            onPress={() => void handleRestore()}
            disabled={purchasing || restoring}
            style={{ alignItems: 'center', paddingVertical: 10 }}
          >
            <Text
              style={{
                fontFamily: 'Inter_400Regular',
                fontSize: 14,
                color: theme.textMuted,
              }}
            >
              {restoring ? 'Restoring…' : 'Restore Purchases'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
