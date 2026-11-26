import type { AcademicApi } from '../../../services/api/academic';
import { ApiError, type Membership } from '../../../services/api/client';
import { academicInstitutionFor, bindAcademicApi, createAccessRunner } from '../academicClient';

const store = (value: string | null) => ({
  get: jest.fn(async () => value),
  set: jest.fn(async () => undefined),
  clear: jest.fn(async () => undefined),
});

describe('createAccessRunner', () => {
  it('gets one access token from the saved refresh token and reuses it', async () => {
    const refresh = jest.fn(async () => ({ accessToken: 'a1' }) as never);
    const run = createAccessRunner(store('r1'), { refresh });
    const call = jest.fn(async (token: string) => token);
    await expect(run(call)).resolves.toBe('a1');
    await expect(run(call)).resolves.toBe('a1');
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledWith('r1');
  });

  it('renews once after a 401 and retries', async () => {
    const refresh = jest
      .fn()
      .mockResolvedValueOnce({ accessToken: 'a1' })
      .mockResolvedValueOnce({ accessToken: 'a2' });
    const run = createAccessRunner(store('r1'), { refresh });
    await run(async () => 'ok');
    const call = jest
      .fn<Promise<string>, [string]>()
      .mockRejectedValueOnce(new ApiError(401, 'UNAUTHENTICATED', 'Inicia sesión para continuar.'))
      .mockImplementation(async (token) => token);
    await expect(run(call)).resolves.toBe('a2');
    expect(call).toHaveBeenLastCalledWith('a2');
  });

  it('answers SESSION_EXPIRED without a saved refresh token and passes other errors through', async () => {
    const run = createAccessRunner(store(null), { refresh: jest.fn() });
    await expect(run(async () => 'x')).rejects.toMatchObject({ status: 401, code: 'SESSION_EXPIRED' });
    const run2 = createAccessRunner(store('r1'), { refresh: jest.fn(async () => ({ accessToken: 'a1' }) as never) });
    const denied = new ApiError(403, 'ROLE_REQUIRED', 'No tienes permiso para hacer esto en esta institución.');
    await expect(run2(async () => Promise.reject(denied))).rejects.toBe(denied);
  });
});

describe('bindAcademicApi', () => {
  it('passes the token and the institution to the API and unwraps the result', async () => {
    const api = {
      sections: jest.fn(async () => ({ sections: [{ sectionId: 1 }] })),
      reviewTeacher: jest.fn(async () => ({ membershipId: 5, status: 'active' })),
    } as unknown as AcademicApi;
    const client = bindAcademicApi((call) => call('tok'), 7, api);
    await expect(client.sections(2, 3)).resolves.toEqual([{ sectionId: 1 }]);
    expect(api.sections).toHaveBeenCalledWith('tok', 7, 2, 3);
    await expect(client.reviewTeacher(5, 'approve')).resolves.toBeUndefined();
    expect(api.reviewTeacher).toHaveBeenCalledWith('tok', 7, 5, 'approve');
  });
});

describe('academicInstitutionFor', () => {
  const m = (institutionId: number, role: Membership['role'], status: Membership['status'] = 'active'): Membership => ({
    institutionId,
    institutionName: `I${institutionId}`,
    role,
    status,
    areaId: role === 'area_admin' ? 1 : null,
  });

  it('prefers the active institution, else the first one with the role', () => {
    const list = [m(1, 'area_admin'), m(2, 'area_admin'), m(3, 'institution_admin')];
    expect(academicInstitutionFor(list, 2, 'area_admin')).toBe(2);
    expect(academicInstitutionFor(list, 3, 'area_admin')).toBe(1);
    expect(academicInstitutionFor(list, null, 'institution_admin')).toBe(3);
    expect(academicInstitutionFor([m(4, 'area_admin', 'pending')], 4, 'area_admin')).toBeNull();
  });
});
