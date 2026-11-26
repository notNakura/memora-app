import { API_URL, ApiError } from '../client';
import { profileApi } from '../profile';

const fetchMock = jest.fn();
beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

const jsonResponse = (status: number, body: unknown) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;
const headers = { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: 'Bearer tok' };
const user = { id: 1 };

describe('profileApi', () => {
  it('updatePreferences patches /me/preferences with only the given fields', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { user }));
    await expect(profileApi.updatePreferences('tok', { timeFactor: 1.5 })).resolves.toEqual({ user });
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/me/preferences`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ timeFactor: 1.5 }),
    });
  });

  it('leaveSection posts to /sections/:sectionId/leave', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { user }));
    await expect(profileApi.leaveSection('tok', 12)).resolves.toEqual({ user });
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/sections/12/leave`, {
      method: 'POST',
      headers: { Accept: 'application/json', Authorization: 'Bearer tok' },
      body: undefined,
    });
  });

  it('passes the server validation error through', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(400, {
        error: {
          code: 'VALIDATION',
          message: 'Revisa los datos marcados.',
          fields: { dailyNewLimit: 'Las tarjetas nuevas por día deben ser un número entero entre 0 y 200.' },
        },
      }),
    );
    const err = await profileApi.updatePreferences('tok', { dailyNewLimit: 500 }).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.fields.dailyNewLimit).toBe('Las tarjetas nuevas por día deben ser un número entero entre 0 y 200.');
  });
});
