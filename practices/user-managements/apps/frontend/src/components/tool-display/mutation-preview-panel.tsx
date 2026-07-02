// Internal
import { UserResultCard } from '@/components/tool-display/user-result-card';
import { parseMutationPreview } from '@/lib/mutation-preview-parsers';

interface MutationPreviewPanelProps {
  readonly preview: unknown;
}

/** Renders structured mutation previews for human-in-the-loop approval. */
export const MutationPreviewPanel = ({
  preview,
}: MutationPreviewPanelProps): React.JSX.Element | null => {
  const parsed = parseMutationPreview(preview);
  if (!parsed) return null;

  if (parsed.kind === 'createUser') {
    return (
      <UserResultCard
        variant="invited"
        preview={{
          name: parsed.name,
          email: parsed.email,
          date_of_birth: parsed.date_of_birth,
          bio: parsed.bio,
        }}
      />
    );
  }

  return null;
};
