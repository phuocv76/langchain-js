'use client';

import { useSyncExternalStore } from 'react';

const subscribe = (): (() => void) => () => undefined;

/** Hydration-safe mounted flag without an effect-driven state update. */
export const useIsMounted = (): boolean =>
  useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
