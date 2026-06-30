import { useCallback, useState } from "react";

export interface InterruptDraft {
  readonly getDraft: (fallback?: string) => string;
  readonly setDraft: (value: string) => void;
}

/** Tracks locally edited draft text for LangGraph review interrupts. */
export const useInterruptDraft = (): InterruptDraft => {
  const [editedDraft, setEditedDraft] = useState("");

  const getDraft = useCallback(
    (fallback?: string): string => editedDraft || fallback || "",
    [editedDraft],
  );

  const setDraft = useCallback((value: string): void => {
    setEditedDraft(value);
  }, []);

  return { getDraft, setDraft };
};
