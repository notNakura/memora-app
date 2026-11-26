// Institution chosen as active on screen 22 (RF-59). Kept only on this phone, like the signup choice;
// it decides which role screen opens first (24/34/35/6) when the user belongs to several institutions.
// When that institution gives the person several roles, the role chosen on screen 22 is kept next to it;
// without one, the widest role decides.
import type { MembershipRole } from './api/client';
import { secureItem } from './secureItem';

export type ActiveInstitutionStore = {
  get(): Promise<number | null>;
  /** Role chosen with the active institution, or null (the widest role decides). */
  getRole(): Promise<MembershipRole | null>;
  /** Saves the institution and its role; without a role, a previously stored role is forgotten. */
  set(institutionId: number, role?: MembershipRole | null): Promise<void>;
  clear(): Promise<void>;
};

const ROLES: readonly MembershipRole[] = ['student', 'teacher', 'area_admin', 'institution_admin'];
const isRole = (value: string | null): value is MembershipRole => ROLES.includes(value as MembershipRole);

const item = secureItem('memora.activeInstitution');
const roleItem = secureItem('memora.activeRole');

export const activeInstitutionStore: ActiveInstitutionStore = {
  get: async () => {
    const value = await item.get();
    return value !== null && /^[1-9]\d*$/.test(value) ? Number(value) : null;
  },
  getRole: async () => {
    const value = await roleItem.get();
    return isRole(value) ? value : null;
  },
  set: async (institutionId, role) => {
    await item.set(String(institutionId));
    await (role ? roleItem.set(role) : roleItem.clear());
  },
  clear: async () => {
    await item.clear();
    await roleItem.clear();
  },
};
