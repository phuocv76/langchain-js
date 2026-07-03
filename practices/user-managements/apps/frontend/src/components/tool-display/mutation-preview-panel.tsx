// Internal
import { UserResultCard } from '@/components/tool-display/user-result-card';
import { MESSAGES } from '@/lib/constants/messages';
import {
  parseMutationPreview,
  type DeleteUserPreview,
  type UserUpdatePreview,
} from '@/lib/mutation-preview-parsers';

interface MutationPreviewPanelProps {
  readonly preview: unknown;
}

/** Derives an @handle from the email local part. */
const emailHandle = (email: string): string => {
  const local = email.split('@')[0]?.trim();
  return local ? `@${local}` : email;
};

/** User avatar glyph shared across mutation cards. */
const AvatarGlyph = (): React.JSX.Element => (
  <svg viewBox="0 0 24 24" className="tool-card__avatar-icon">
    <circle cx="12" cy="8" r="4" fill="currentColor" />
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" fill="currentColor" />
  </svg>
);

/** Card summarising the field-level diff for an update mutation. */
const UpdatePreviewCard = ({
  preview,
}: {
  preview: UserUpdatePreview;
}): React.JSX.Element => (
  <div className="tool-card-wrap">
    <div className="tool-card">
      <p className="tool-card__badge">{MESSAGES.CARD_REVIEW_CHANGES}</p>

      <div className="tool-card__body">
        <div className="tool-card__avatar" aria-hidden>
          <AvatarGlyph />
        </div>
        <div className="tool-card__details">
          <p className="tool-card__name">{preview.name}</p>
          <p className="tool-card__handle">{emailHandle(preview.email)}</p>
        </div>
      </div>

      <div className="tool-card__divider" role="presentation" />

      {preview.changes.length === 0 ? (
        <p className="tool-card__meta">{MESSAGES.NO_CHANGES}</p>
      ) : (
        <ul className="mutation-diff">
          {preview.changes.map((change) => (
            <li className="mutation-diff__row" key={change.field}>
              <span className="mutation-diff__label">{change.label}</span>
              <span className="mutation-diff__values">
                <span className="mutation-diff__old">{change.oldValue}</span>
                <span className="mutation-diff__arrow" aria-hidden>
                  →
                </span>
                <span className="mutation-diff__new">{change.newValue}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  </div>
);

/** Card confirming a destructive delete mutation. */
const DeletePreviewCard = ({
  preview,
}: {
  preview: DeleteUserPreview;
}): React.JSX.Element => (
  <div className="tool-card-wrap">
    <div className="tool-card tool-card--danger">
      <p className="tool-card__badge tool-card__badge--danger">
        {MESSAGES.CARD_DELETE}
      </p>

      <div className="tool-card__body">
        <div
          className="tool-card__avatar tool-card__avatar--danger"
          aria-hidden
        >
          <AvatarGlyph />
        </div>
        <div className="tool-card__details">
          <p className="tool-card__name">{preview.name}</p>
          <p className="tool-card__handle">{emailHandle(preview.email)}</p>
        </div>
      </div>

      <div className="tool-card__divider" role="presentation" />

      <p className="tool-card__meta tool-card__meta--danger">
        {MESSAGES.DELETE_WARNING}
      </p>
    </div>
  </div>
);

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

  if (parsed.kind === 'userUpdate') {
    return <UpdatePreviewCard preview={parsed} />;
  }

  if (parsed.kind === 'deleteUser') {
    return <DeletePreviewCard preview={parsed} />;
  }

  return null;
};
