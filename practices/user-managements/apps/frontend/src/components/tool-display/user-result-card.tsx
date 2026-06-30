// Internal
import { MESSAGES } from '@/lib/constants/messages';
import type { ClientUser } from '@/lib/tool-output-parsers';

const initials = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ''}${parts[parts.length - 1]![0] ?? ''}`.toUpperCase();
};

export type UserCardVariant =
  'invited' | 'updated' | 'profile-loaded' | 'profile-updated';

const VARIANT_META: Record<
  UserCardVariant,
  { badge: string; success: string; tone: 'sky' | 'violet' }
> = {
  invited: {
    badge: MESSAGES.CARD_INVITED,
    success: MESSAGES.SUCCESS_INVITED,
    tone: 'sky',
  },
  updated: {
    badge: MESSAGES.CARD_UPDATED,
    success: MESSAGES.SUCCESS_UPDATED,
    tone: 'violet',
  },
  'profile-loaded': {
    badge: MESSAGES.CARD_PROFILE,
    success: MESSAGES.SUCCESS_PROFILE,
    tone: 'sky',
  },
  'profile-updated': {
    badge: MESSAGES.CARD_PROFILE_UPDATED,
    success: MESSAGES.SUCCESS_PROFILE_UPDATED,
    tone: 'violet',
  },
};

interface UserResultCardProps {
  readonly user: ClientUser;
  readonly variant: UserCardVariant;
}

/** Rich card for user tool results (create, update, profile). */
export const UserResultCard = ({
  user,
  variant,
}: UserResultCardProps): React.JSX.Element => {
  const meta = VARIANT_META[variant];
  const joined = new Date(user.created_at).toLocaleString();

  return (
    <div className={`tool-card tool-card--${meta.tone}`}>
      <p className="tool-card__badge">{meta.badge}</p>
      <div className="tool-card__body">
        <div className="tool-card__avatar" aria-hidden>
          {initials(user.name)}
        </div>
        <div className="tool-card__details">
          <p className="tool-card__name">{user.name}</p>
          <p className="tool-card__email">{user.email}</p>
          <p className="tool-card__meta">
            {MESSAGES.DOB}: {user.date_of_birth ?? '—'}
          </p>
          <p className="tool-card__meta">
            {MESSAGES.ROLE_ADMIN}/{MESSAGES.ROLE_MEMBER}:{' '}
            {user.role === 'admin' ? MESSAGES.ROLE_ADMIN : MESSAGES.ROLE_MEMBER}
            {' · '}
            {user.status === 'active'
              ? MESSAGES.STATUS_ACTIVE
              : MESSAGES.STATUS_INACTIVE}
          </p>
          {user.bio?.trim() ? (
            <p className="tool-card__meta">
              {MESSAGES.BIO}: {user.bio.trim()}
            </p>
          ) : null}
          <p className="tool-card__meta">
            {MESSAGES.JOINED}: {joined}
          </p>
        </div>
      </div>
      <p className="tool-card__success">{meta.success}</p>
    </div>
  );
};
