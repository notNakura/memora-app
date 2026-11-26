import { API_URL, ApiError } from '../client';
import { adminApi } from '../admin';

const fetchMock = jest.fn();
beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

const jsonResponse = (status: number, body: unknown) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;

const jsonHeaders = { Accept: 'application/json', 'Content-Type': 'application/json' };
const auth = { Authorization: 'Bearer tok' };
const P = `${API_URL}/admin/institutions/7`;

describe('adminApi', () => {
  it('overview gets screen 34 with the institution in the path', async () => {
    const body = { join: { code: 'UNERGK26' }, areas: [], admins: [] };
    fetchMock.mockResolvedValue(jsonResponse(200, body));
    await expect(adminApi.overview('tok', 7)).resolves.toEqual(body);
    expect(fetchMock).toHaveBeenCalledWith(`${P}/overview`, {
      method: 'GET',
      headers: { Accept: 'application/json', ...auth },
      body: undefined,
    });
  });

  it('assignAdmin posts the person and the area (null: the whole institution)', async () => {
    fetchMock.mockResolvedValue(jsonResponse(201, { admin: { membershipId: 3 } }));
    await adminApi.assignAdmin('tok', 7, 12, null);
    expect(fetchMock).toHaveBeenCalledWith(`${P}/admins`, {
      method: 'POST',
      headers: { ...jsonHeaders, ...auth },
      body: JSON.stringify({ userId: 12, areaId: null }),
    });
  });

  it('members sends only the filters that are set', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { members: [] }));
    await adminApi.members('tok', 7, { q: 'María H', role: undefined, status: 'removed' });
    expect(fetchMock.mock.calls[0][0]).toBe(`${P}/members?q=Mar%C3%ADa%20H&status=removed`);
  });

  it('decide posts the ids and the decision', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { updated: 2 }));
    await expect(adminApi.decide('tok', 7, [1, 2], 'approve')).resolves.toEqual({ updated: 2 });
    expect(fetchMock).toHaveBeenCalledWith(`${P}/requests/decide`, {
      method: 'POST',
      headers: { ...jsonHeaders, ...auth },
      body: JSON.stringify({ membershipIds: [1, 2], decision: 'approve' }),
    });
  });

  it('importRoster sends the file as text/csv with its name in the query', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { roster: { created: 1 } }));
    await adminApi.importRoster('tok', 7, 'cedula;nombres\n', 'inscritos_SI3_2026-II.csv');
    expect(fetchMock).toHaveBeenCalledWith(`${P}/roster/import?fileName=inscritos_SI3_2026-II.csv`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'text/csv', ...auth },
      body: 'cedula;nombres\n',
    });
  });

  it('previewRoster turns a server error into ApiError and a failed fetch into NETWORK', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(400, { error: { code: 'ROSTER_COLUMNS', message: 'Al archivo le faltan columnas: correo.' } }),
    );
    await expect(adminApi.previewRoster('tok', 7, 'x')).rejects.toMatchObject({
      status: 400,
      code: 'ROSTER_COLUMNS',
      message: 'Al archivo le faltan columnas: correo.',
    });
    fetchMock.mockRejectedValueOnce(new Error('offline'));
    const err = await adminApi.previewRoster('tok', 7, 'x').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe('NETWORK');
  });

  it('deckAction and audit use their paths', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, {}));
    await adminApi.deckAction('tok', 7, 5, 'hide');
    await adminApi.audit('tok', 7, { action: 'deck_hidden', before: '40', limit: 20 });
    expect(fetchMock.mock.calls[0][0]).toBe(`${P}/moderation/decks/5/hide`);
    expect(fetchMock.mock.calls[1][0]).toBe(`${P}/audit?action=deck_hidden&before=40&limit=20`);
  });
});
