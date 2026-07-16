'use client';

/**
 * Structured renderers for workspace tool results.
 *
 * The product API wraps payloads as `{ data: ... }`; shapes beyond the known
 * fields vary per endpoint, so every renderer degrades gracefully: known
 * fields get dedicated treatment, the rest falls back to labeled rows.
 */

const HTML_ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&nbsp;': ' ',
};

/** Bio fields arrive as HTML; render them as plain text, never as markup. */
const stripHtml = (value: string): string =>
  value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z0-9#]+;/gi, (entity) => HTML_ENTITIES[entity] ?? ' ')
    .replace(/\s+/g, ' ')
    .trim();

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

const formatValue = (value: unknown): string => {
  if (typeof value === 'string' && ISO_DATE_PATTERN.test(value)) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    }
  }
  return String(value);
};

const isPrimitive = (value: unknown): value is string | number | boolean =>
  ['string', 'number', 'boolean'].includes(typeof value);

const labelize = (key: string): string =>
  key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]/g, ' ')
    .replace(/^./, (c) => c.toUpperCase());

/** Unwraps the product API's `{ data: ... }` envelope when present. */
const unwrap = (value: unknown): unknown =>
  value !== null &&
  typeof value === 'object' &&
  'data' in value &&
  Object.keys(value).length === 1
    ? (value as { data: unknown }).data
    : value;

const initialsOf = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

const Badge = ({ children }: { readonly children: string }): React.JSX.Element => (
  <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
    {children}
  </span>
);

/** Fields the profile header already presents; hidden from the detail rows. */
const PROFILE_HEADER_FIELDS = new Set([
  'name',
  'username',
  'bio',
  'avatar',
  'workingStatus',
  'division',
  'role',
]);

const DetailRows = ({
  record,
  omit = new Set<string>(),
}: {
  readonly record: Record<string, unknown>;
  readonly omit?: ReadonlySet<string>;
}): React.JSX.Element => {
  const primitives = Object.entries(record).filter(
    ([key, value]) => !omit.has(key) && isPrimitive(value),
  );
  const nested = Object.entries(record).filter(
    ([key, value]) => !omit.has(key) && value != null && !isPrimitive(value),
  );

  return (
    <div className="space-y-2">
      <dl className="divide-y divide-border">
        {primitives.map(([key, value]) => (
          <div key={key} className="flex gap-3 py-1.5 text-sm">
            <dt className="w-32 shrink-0 text-muted-foreground">{labelize(key)}</dt>
            <dd className="min-w-0 break-words text-foreground">
              {formatValue(value)}
            </dd>
          </div>
        ))}
      </dl>
      {nested.map(([key, value]) => (
        <details key={key} className="text-sm">
          <summary className="cursor-pointer py-1 text-muted-foreground">
            {labelize(key)}
          </summary>
          <pre className="mt-1 overflow-x-auto rounded-lg bg-muted p-2 text-xs">
            {JSON.stringify(value, null, 2)}
          </pre>
        </details>
      ))}
    </div>
  );
};

/** Employee profile: identity header with badges, bio, then detail rows. */
const ProfileCard = ({
  profile,
}: {
  readonly profile: Record<string, unknown>;
}): React.JSX.Element => {
  const name = typeof profile.name === 'string' ? profile.name : 'Unknown';
  const username =
    typeof profile.username === 'string' ? `@${profile.username}` : null;
  const bio = typeof profile.bio === 'string' ? stripHtml(profile.bio) : null;
  const badges = ['workingStatus', 'division', 'role']
    .map((key) => profile[key])
    .filter((value): value is string => typeof value === 'string' && !!value);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-base font-semibold text-primary-foreground">
          {initialsOf(name)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-foreground">{name}</p>
          {username && (
            <p className="truncate text-sm text-muted-foreground">{username}</p>
          )}
        </div>
      </div>
      {badges.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {badges.map((badge) => (
            <Badge key={badge}>{labelize(badge)}</Badge>
          ))}
        </div>
      )}
      {bio && <p className="text-sm leading-relaxed text-foreground">{bio}</p>}
      <DetailRows record={profile} omit={PROFILE_HEADER_FIELDS} />
    </div>
  );
};

/** Stats: prominent numbers in a grid, other values as rows. */
const StatsGrid = ({
  stats,
}: {
  readonly stats: Record<string, unknown>;
}): React.JSX.Element => {
  const numbers = Object.entries(stats).filter(
    ([, value]) => typeof value === 'number',
  );
  const rest = Object.fromEntries(
    Object.entries(stats).filter(([, value]) => typeof value !== 'number'),
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {numbers.map(([key, value]) => (
          <div key={key} className="rounded-lg border border-border p-3">
            <p className="text-2xl font-semibold text-foreground">
              {Number(value).toLocaleString('en-US')}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{labelize(key)}</p>
          </div>
        ))}
      </div>
      {Object.keys(rest).length > 0 && <DetailRows record={rest} />}
    </div>
  );
};

/** Picks a human heading for one list item, returning the field it used. */
const headingOf = (
  item: Record<string, unknown>,
): { key: string; value: string } | null => {
  for (const key of ['name', 'title', 'username', 'email', 'id']) {
    const value = item[key];
    if (typeof value === 'string' && value) return { key, value };
  }
  return null;
};

/** Generic list: one card per item with a heading and compact rows. */
const ListCards = ({ items }: { readonly items: unknown[] }): React.JSX.Element => {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No results.</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        if (item === null || typeof item !== 'object') {
          return (
            <div key={index} className="rounded-lg border border-border p-3 text-sm">
              {String(item)}
            </div>
          );
        }
        const record = item as Record<string, unknown>;
        const heading = headingOf(record);
        return (
          <div key={index} className="rounded-lg border border-border p-3">
            {heading && (
              <p className="mb-1 text-sm font-semibold text-foreground">
                {heading.value}
              </p>
            )}
            <DetailRows
              record={record}
              omit={heading ? new Set([heading.key]) : undefined}
            />
          </div>
        );
      })}
    </div>
  );
};

/** Finds the array inside common list envelopes ({items}, {results}, ...). */
const listItemsOf = (value: unknown): unknown[] | null => {
  if (Array.isArray(value)) return value;
  if (value !== null && typeof value === 'object') {
    for (const key of ['items', 'results', 'list', 'records']) {
      const inner = (value as Record<string, unknown>)[key];
      if (Array.isArray(inner)) return inner;
    }
  }
  return null;
};

/** Renders one tool result with a dedicated layout per tool kind. */
export const PreviewBody = ({
  kind,
  data,
}: {
  /** Tool name that produced the result. */
  readonly kind: string;
  readonly data: unknown;
}): React.JSX.Element => {
  const payload = unwrap(data);

  if (kind === 'get_employee_profile' && payload !== null && typeof payload === 'object') {
    return <ProfileCard profile={payload as Record<string, unknown>} />;
  }

  if (kind === 'get_workspace_stats' && payload !== null && typeof payload === 'object') {
    return <StatsGrid stats={payload as Record<string, unknown>} />;
  }

  const items = listItemsOf(payload);
  if (items) {
    return <ListCards items={items} />;
  }

  if (payload !== null && typeof payload === 'object') {
    return <DetailRows record={payload as Record<string, unknown>} />;
  }

  return <p className="text-sm text-foreground">{String(payload)}</p>;
};
