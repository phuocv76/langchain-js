// Libs for third party
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';

// Internal
import { resolveInterruptFeedback } from '@/lib/interrupts/actions';

interface InterruptRegistration {
  readonly resolve: (value: string) => void;
  readonly canAcceptChatFeedback: boolean;
}

export interface InterruptFeedbackBridge {
  readonly isActive: boolean;
  readonly canAcceptChatFeedback: boolean;
  readonly register: (registration: InterruptRegistration) => void;
  readonly unregister: () => void;
  readonly submitFeedback: (feedback: string) => boolean;
}

const InterruptFeedbackBridgeContext =
  createContext<InterruptFeedbackBridge | null>(null);

/** Provides active LangGraph interrupt handlers to chat and review UI. */
export const InterruptFeedbackBridgeProvider = ({
  children,
}: {
  readonly children: React.ReactNode;
}): React.JSX.Element => {
  const registrationRef = useRef<InterruptRegistration | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [canAcceptChatFeedback, setCanAcceptChatFeedback] = useState(false);

  const register = useCallback((registration: InterruptRegistration): void => {
    registrationRef.current = registration;
    setIsActive(true);
    setCanAcceptChatFeedback(registration.canAcceptChatFeedback);
  }, []);

  const unregister = useCallback((): void => {
    registrationRef.current = null;
    setIsActive(false);
    setCanAcceptChatFeedback(false);
  }, []);

  const submitFeedback = useCallback((feedback: string): boolean => {
    const registration = registrationRef.current;
    const trimmed = feedback.trim();

    if (!registration || !trimmed) {
      return false;
    }

    resolveInterruptFeedback(registration.resolve, trimmed);
    registrationRef.current = null;
    setIsActive(false);
    setCanAcceptChatFeedback(false);
    return true;
  }, []);

  const value = useMemo(
    (): InterruptFeedbackBridge => ({
      isActive,
      canAcceptChatFeedback,
      register,
      unregister,
      submitFeedback,
    }),
    [
      canAcceptChatFeedback,
      isActive,
      register,
      submitFeedback,
      unregister,
    ],
  );

  return (
    <InterruptFeedbackBridgeContext.Provider value={value}>
      {children}
    </InterruptFeedbackBridgeContext.Provider>
  );
};

/** Reads the active interrupt bridge from context. */
export const useInterruptFeedbackBridge = (): InterruptFeedbackBridge => {
  const context = useContext(InterruptFeedbackBridgeContext);

  if (!context) {
    throw new Error(
      'useInterruptFeedbackBridge must be used within InterruptFeedbackBridgeProvider',
    );
  }

  return context;
};
