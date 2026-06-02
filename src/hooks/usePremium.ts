import { useEffect, useState } from 'react';
import { isPremium } from '../lib/premium';

export function usePremium(): { isPremium: boolean; loading: boolean } {
  const [premium, setPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    isPremium().then((result) => {
      setPremium(result);
      setLoading(false);
    });
  }, []);

  return { isPremium: premium, loading };
}
