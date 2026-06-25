// Libs for third party
import { useCopilotContext } from "@copilotkit/react-core";
import { useAgent, useCopilotKit } from "@copilotkit/react-core/v2";
import { useCallback, useEffect, useRef, useState } from "react";

// Internal
import {
  isThreadLockError,
  THREAD_LOCK_GRACE_MS,
  THREAD_LOCK_RETRY_MS,
} from "@/lib/threads/lock";

export interface ThreadLockGraceState {
  readonly effectiveIsRunning: boolean;
}

/**
 * Handles CopilotKit Intelligence thread-lock races with silent retries
 * and suppresses transient error banners during the grace window.
 *
 * @param agentId - CopilotKit agent id backing the chat surface.
 */
export const useThreadLockGrace = (agentId: string): ThreadLockGraceState => {
  const { agent } = useAgent({ agentId });
  const { copilotkit } = useCopilotKit();
  const { setBannerError } = useCopilotContext();
  const [lockGraceUntil, setLockGraceUntil] = useState(0);
  const [, setGraceTick] = useState(0);
  const lockGraceUntilRef = useRef(0);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Clears CopilotKit error banners triggered by thread-lock races. */
  const dismissThreadLockBanner = useCallback((): void => {
    setBannerError(null);
    queueMicrotask(() => setBannerError(null));
    requestAnimationFrame(() => setBannerError(null));
  }, [setBannerError]);

  /** Silently retries the agent run until the grace window ends. */
  const scheduleLockRetry = useCallback((): void => {
    if (retryTimeoutRef.current !== null) {
      return;
    }

    const attemptRetry = (): void => {
      if (Date.now() >= lockGraceUntilRef.current) {
        retryTimeoutRef.current = null;
        setLockGraceUntil(0);
        lockGraceUntilRef.current = 0;
        return;
      }

      void copilotkit.runAgent({ agent }).finally(() => {
        if (Date.now() >= lockGraceUntilRef.current) {
          retryTimeoutRef.current = null;
          setLockGraceUntil(0);
          lockGraceUntilRef.current = 0;
          return;
        }

        retryTimeoutRef.current = setTimeout(
          attemptRetry,
          THREAD_LOCK_RETRY_MS,
        );
      });
    };

    retryTimeoutRef.current = setTimeout(attemptRetry, THREAD_LOCK_RETRY_MS);
  }, [agent, copilotkit]);

  /** Starts the loading grace window after a thread-lock error. */
  const handleThreadLock = useCallback((): void => {
    const graceEnd = Date.now() + THREAD_LOCK_GRACE_MS;
    lockGraceUntilRef.current = graceEnd;
    setLockGraceUntil(graceEnd);
    dismissThreadLockBanner();
    scheduleLockRetry();
  }, [dismissThreadLockBanner, scheduleLockRetry]);

  useEffect(() => {
    const subscription = copilotkit.subscribe({
      onError: ({ code, error }) => {
        if (!isThreadLockError(code, error)) {
          return;
        }

        handleThreadLock();
      },
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [copilotkit, handleThreadLock]);

  useEffect(() => {
    if (lockGraceUntil <= Date.now()) {
      return;
    }

    const intervalId = setInterval(() => {
      dismissThreadLockBanner();

      if (Date.now() >= lockGraceUntilRef.current) {
        setLockGraceUntil(0);
        lockGraceUntilRef.current = 0;
      }

      setGraceTick((tick) => tick + 1);
    }, 250);

    return () => {
      clearInterval(intervalId);
    };
  }, [dismissThreadLockBanner, lockGraceUntil]);

  useEffect(
    () => () => {
      if (retryTimeoutRef.current !== null) {
        clearTimeout(retryTimeoutRef.current);
      }
    },
    [],
  );

  const isLockGraceActive = lockGraceUntil > 0 && Date.now() < lockGraceUntil;

  return {
    effectiveIsRunning: agent.isRunning || isLockGraceActive,
  };
};
