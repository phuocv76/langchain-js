// Libs for third party
import { useLangGraphInterrupt } from '@copilotkit/react-core';

// Internal
import { InterruptReviewCard } from '@/components/interrupts/interrupt-review-card';
import { MutationPreviewPanel } from '@/components/tool-display/mutation-preview-panel';
import { parseMutationPreview } from '@/lib/mutation-preview-parsers';

interface MutationInterruptPayload {
  action?: string;
  preview?: unknown;
  message?: string;
  hint?: string;
}

const formatPreview = (preview: unknown): string => {
  if (preview === undefined) return 'No preview available.';
  return typeof preview === 'string'
    ? preview
    : JSON.stringify(preview, null, 2);
};

const renderPreview = (preview: unknown): React.ReactNode => {
  if (parseMutationPreview(preview)) {
    return <MutationPreviewPanel preview={preview} />;
  }

  return <pre className="interrupt-card__panel">{formatPreview(preview)}</pre>;
};

const MUTATION_ACTIONS = new Set([
  'create_user',
  'update_user',
  'delete_user',
  'update_my_profile',
]);

/** Renders human-in-the-loop approval for directory mutations. */
export const UserMutationReviewInterrupt = (): null => {
  useLangGraphInterrupt<MutationInterruptPayload>({
    enabled: ({ eventValue }) =>
      Boolean(eventValue?.action && MUTATION_ACTIONS.has(eventValue.action)),
    render: ({ event, resolve }) => {
      const value = event.value;
      const actionLabel = (value.action ?? 'mutation').replace(/_/g, ' ');

      const preview = renderPreview(value.preview);

      return (
        <InterruptReviewCard
          title={`Confirm ${actionLabel}`}
          subtitle={value.message ?? value.hint}
          preview={preview}
          onResolve={resolve}
        />
      );
    },
  });

  return null;
};
