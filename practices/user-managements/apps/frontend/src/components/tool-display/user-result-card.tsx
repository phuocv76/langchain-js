// Internal
import { MESSAGES } from '@/lib/constants/messages';
import type { ClientUser } from '@/lib/tool-output-parsers';

export type UserCardVariant =
  'invited' | 'updated' | 'profile-loaded' | 'profile-updated';

const VARIANT_META: Record<
  UserCardVariant,
  { badge: string; success: string | null }
> = {
  invited: {
    badge: MESSAGES.CARD_INVITED,
    success: MESSAGES.SUCCESS_INVITED,
  },
  updated: {
    badge: MESSAGES.CARD_UPDATED,
    success: MESSAGES.SUCCESS_UPDATED,
  },
  'profile-loaded': {
    badge: MESSAGES.CARD_PROFILE,
    success: null,
  },
  'profile-updated': {
    badge: MESSAGES.CARD_PROFILE_UPDATED,
    success: MESSAGES.SUCCESS_PROFILE_UPDATED,
  },
};

export interface UserCardPreview {
  name: string;
  email: string;
  date_of_birth?: string | null;
  bio?: string | null;
}

interface UserResultCardProps {
  readonly user?: ClientUser;
  readonly preview?: UserCardPreview;
  readonly variant: UserCardVariant;
}

/** Derives an @handle from the email local part. */
const emailHandle = (email: string): string => {
  const local = email.split('@')[0]?.trim();
  return local ? `@${local}` : email;
};

/** Formats a card footer timestamp (e.g. Updated at 02:50 PM • Jul 2, 2026). */
const formatCardTimestamp = (epochMs: number): string => {
  const date = new Date(epochMs);
  const time = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  const day = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return `Updated at ${time} • ${day}`;
};

/** Rich card for user tool results (create, update, profile). */
export const UserResultCard = ({
  user,
  preview,
  variant,
}: UserResultCardProps): React.JSX.Element => {
  const meta = VARIANT_META[variant];
  const display = user ?? preview;
  if (!display) {
    throw new Error('UserResultCard requires user or preview.');
  }

  const isPreview = Boolean(preview && !user);
  const badge =
    isPreview && variant === 'invited' ? MESSAGES.CARD_INVITING : meta.badge;

  return (
    <div className="tool-card-wrap">
      <div className="tool-card">
        <p className="tool-card__badge">{badge}</p>

        <div className="tool-card__body">
          <div className="tool-card__avatar" aria-hidden>
            <svg viewBox="0 0 24 24" className="tool-card__avatar-icon">
              <circle cx="12" cy="8" r="4" fill="currentColor" />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" fill="currentColor" />
            </svg>
          </div>

          <div className="tool-card__details">
            <p className="tool-card__name">{display.name}</p>
            <p className="tool-card__handle">{emailHandle(display.email)}</p>
          </div>
        </div>

        <div className="tool-card__divider" role="presentation" />

        {isPreview ? (
          <div className="tool-card__meta-list">
            {preview?.date_of_birth ? (
              <p className="tool-card__meta">
                {MESSAGES.DOB}: {preview.date_of_birth}
              </p>
            ) : null}
            {preview?.bio ? (
              <p className="tool-card__meta">
                {MESSAGES.BIO}: {preview.bio}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="tool-card__timestamp">
            {formatCardTimestamp(user!.created_at)}
          </p>
        )}
      </div>

      {!isPreview && meta.success ? (
        <p className="tool-card__success">
          <span aria-hidden className="tool-card__success-icon">
            ✓
          </span>
          {meta.success}
        </p>
      ) : null}
    </div>
  );
};
