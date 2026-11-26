// Admin API bound to the session's renew-on-401 helper (useSession().withAccess) and the active
// institution, so screens 34, 36 and 37 call `service.overview()` without passing token and institution.
import { adminApi, type AdminApi } from '../../services/api/admin';

/** Runs an API call with a valid access token (the session's withAccess). */
export type TokenCall = <T>(fn: (accessToken: string) => Promise<T>) => Promise<T>;

type Bound<F> = F extends (token: string, institutionId: number, ...args: infer A) => infer R ? (...args: A) => R : never;
export type AdminService = { [K in keyof AdminApi]: Bound<AdminApi[K]> };

export function bindAdminService(call: TokenCall, institutionId: number, api: AdminApi = adminApi): AdminService {
  const entries = Object.entries(api).map(([key, fn]) => [
    key,
    (...args: unknown[]) =>
      call((token) => (fn as (t: string, id: number, ...a: unknown[]) => Promise<unknown>)(token, institutionId, ...args)),
  ]);
  return Object.fromEntries(entries) as AdminService;
}
