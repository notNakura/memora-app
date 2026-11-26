import type { User } from '../../../services/api/client';
import { adminApi } from '../../../services/api/admin';
import { bindAdminService } from '../adminService';
import { adminInstitution } from '../routes';

jest.mock('expo-haptics', () => ({ selectionAsync: jest.fn(() => Promise.resolve()) }));

describe('bindAdminService', () => {
  it('passes the session token and the institution id before the call arguments', async () => {
    const api = { ...adminApi, decide: jest.fn(async () => ({ updated: 1 })) };
    const call = jest.fn(async (fn: (token: string) => Promise<unknown>) => fn('tok'));
    const service = bindAdminService(call as never, 7, api);
    await expect(service.decide([3], 'reject')).resolves.toEqual({ updated: 1 });
    expect(api.decide).toHaveBeenCalledWith('tok', 7, [3], 'reject');
    expect(call).toHaveBeenCalledTimes(1);
  });
});

describe('adminInstitution', () => {
  const user = {
    memberships: [
      { institutionId: 1, institutionName: 'UNERG', role: 'student', status: 'active', areaId: null },
      { institutionId: 2, institutionName: 'IUT', role: 'area_admin', status: 'active', areaId: 4 },
      { institutionId: 3, institutionName: 'Curso', role: 'institution_admin', status: 'active', areaId: null },
      { institutionId: 4, institutionName: 'Otra', role: 'institution_admin', status: 'removed', areaId: null },
    ],
  } as unknown as User;

  it('prefers the active institution when the person administers it', () => {
    expect(adminInstitution(user, 2)).toEqual({ institutionId: 2, institutionName: 'IUT', institutionAdmin: false });
  });

  it('falls back to an institution the person administers, never a removed one', () => {
    expect(adminInstitution(user, 1)).toEqual({ institutionId: 3, institutionName: 'Curso', institutionAdmin: true });
    expect(adminInstitution({ memberships: [user.memberships[3]] } as User, 4)).toBeNull();
  });
});
