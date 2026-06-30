// Libs for third party
import { InMemoryStore } from "@langchain/core/stores";

// Types
import type { CustomerProfile } from "../schemas/warranty";

const KEY_PREFIX = "warranty-customer:";

let store: InMemoryStore<CustomerProfile> | undefined;

/** Returns the shared long-term memory store for customer profiles. */
export const getLongTermStore = (): InMemoryStore<CustomerProfile> => {
  if (!store) {
    store = new InMemoryStore<CustomerProfile>();
  }
  return store;
};

const profileKey = (customerId: string): string => `${KEY_PREFIX}${customerId}`;

/**
 * Loads a customer profile from long-term memory.
 *
 * @param customerId - Stable customer identifier.
 */
export const loadCustomerProfile = async (
  customerId: string,
): Promise<CustomerProfile | undefined> => {
  const memory = getLongTermStore();
  const [profile] = await memory.mget([profileKey(customerId)]);
  return profile;
};

/**
 * Persists or updates a customer profile in long-term memory.
 *
 * @param profile - Customer profile to store.
 */
export const saveCustomerProfile = async (
  profile: CustomerProfile,
): Promise<void> => {
  const memory = getLongTermStore();
  await memory.mset([[profileKey(profile.customerId), profile]]);
};

/**
 * Ensures a profile exists, creating a default when missing.
 *
 * @param customerId - Customer identifier from runtime context.
 */
export const ensureCustomerProfile = async (
  customerId: string,
): Promise<CustomerProfile> => {
  const existing = await loadCustomerProfile(customerId);
  if (existing) {
    return existing;
  }

  const profile: CustomerProfile = {
    customerId,
    products: [],
    previousClaims: 0,
  };
  await saveCustomerProfile(profile);
  return profile;
};
