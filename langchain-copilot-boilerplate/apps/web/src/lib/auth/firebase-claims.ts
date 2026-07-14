const DEFAULT_TENANT_ID = 'default';
const DEFAULT_ROLES = ['member'] as const;

export const readFirebaseRoles = (
  value: unknown,
): readonly string[] | undefined =>
  Array.isArray(value) && value.every((role) => typeof role === 'string')
    ? value
    : undefined;

export const hasRequiredFirebaseClaims = (decoded: {
  tenant_id?: unknown;
  roles?: unknown;
}): boolean => {
  const tenantId = decoded.tenant_id;
  const roles = readFirebaseRoles(decoded.roles);
  return typeof tenantId === 'string' && tenantId.length > 0 && !!roles;
};

export const getDefaultFirebaseClaims = (): {
  tenant_id: string;
  roles: string[];
} => ({
  tenant_id: process.env.FIREBASE_DEFAULT_TENANT_ID?.trim() || DEFAULT_TENANT_ID,
  roles: [...DEFAULT_ROLES],
});
