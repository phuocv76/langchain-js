'use client';

// Libs for third party
import { createContext, useContext, useMemo, useState } from 'react';

export interface PreviewContent {
  /** Tool name that produced the result; selects the panel layout. */
  readonly kind: string;
  /** Panel heading, e.g. "Employee profile". */
  readonly title: string;
  /** Parsed tool result to visualize. */
  readonly data: unknown;
}

type PreviewPanelContextValue = {
  preview: PreviewContent | null;
  showPreview: (content: PreviewContent) => void;
  clearPreview: () => void;
};

const PreviewPanelContext = createContext<PreviewPanelContextValue | null>(null);

/** Holds the content shown in the side panel next to the chat. */
export const PreviewPanelProvider = ({
  children,
}: {
  readonly children: React.ReactNode;
}): React.JSX.Element => {
  const [preview, setPreview] = useState<PreviewContent | null>(null);

  const value = useMemo(
    () => ({
      preview,
      showPreview: setPreview,
      clearPreview: () => setPreview(null),
    }),
    [preview],
  );

  return (
    <PreviewPanelContext.Provider value={value}>
      {children}
    </PreviewPanelContext.Provider>
  );
};

export const usePreviewPanel = (): PreviewPanelContextValue => {
  const context = useContext(PreviewPanelContext);

  if (!context) {
    throw new Error('usePreviewPanel must be used within PreviewPanelProvider');
  }

  return context;
};
