import { useEffect, useState } from 'react';
import Purchases from 'react-native-purchases';
import { isPremium } from '../lib/premium';

export function usePremium(): { isPremium: boolean; loading: boolean } {
  const [premium, setPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    isPremium().then((result) => {
      setPremium(result);
      setLoading(false);
    });

    // Keep premium state in sync with RevenueCat — fires immediately after a
    // purchase or restore completes, so the UI unlocks without needing a restart.
    const remove = Purchases.addCustomerInfoUpdateListener((info) => {
      setPremium(info.entitlements.active['premium'] !== undefined);
    });
    return remove;
  }, []);

  return { isPremium: premium, loading };
}
