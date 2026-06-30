// Libs for third party
import { useEffect, useState } from 'react';

/** Returns true after client hydration (avoids SSR mismatch). */
export const useClientMounted = (): boolean => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted;
};
