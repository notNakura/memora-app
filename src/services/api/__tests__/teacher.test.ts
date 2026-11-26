import { API_URL, ApiError } from '../client';
import { teacherApi } from '../teacher';

const fetchMock = jest.fn();
beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

const jsonResponse = (status: number, body: unknown) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;
const getHeaders = { Accept: 'application/json', Authorization: 'Bearer tok' };
const jsonHeaders = { ...getHeaders, 'Content-Type': 'application/json' };
const base = `${API_URL}/institutions/7/teacher`;

describe('teacherApi', () => {
  it('sections gets the teacher’s sections of the institution', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { sections: [] }));
    await expect(teacherApi.sections('tok', 7)).resolves.toEqual({ sections: [] });
    expect(fetchMock).toHaveBeenCalledWith(`${base}/sections`, { method: 'GET', headers: getHeaders, body: undefined });
  });

  it('section, requests and student read one section', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, {}));
    await teacherApi.section('tok', 7, 3);
    await teacherApi.requests('tok', 7, 3);
    await teacherApi.student('tok', 7, 3, 12);
    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual([
      `${base}/sections/3`,
      `${base}/sections/3/requests`,
      `${base}/sections/3/students/12`,
    ]);
  });

  it('updateJoinSettings patches only the given fields', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { section: {} }));
    await teacherApi.updateJoinSettings('tok', 7, 3, { joinMode: 'open', capacity: null });
    expect(fetchMock).toHaveBeenCalledWith(`${base}/sections/3/join-settings`, {
      method: 'PATCH',
      headers: jsonHeaders,
      body: JSON.stringify({ joinMode: 'open', capacity: null }),
    });
  });

  it('regenerateCode, decide, unlockUnit, previewRoster and importRoster post to their routes', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, {}));
    await teacherApi.regenerateCode('tok', 7, 3);
    await teacherApi.decide('tok', 7, 3, 'approve', [4, 5]);
    await teacherApi.unlockUnit('tok', 7, 3, 12, 9, 'Reposo');
    await teacherApi.previewRoster('tok', 7, 3, 'a,b');
    await teacherApi.importRoster('tok', 7, 3, 'a,b');
    expect(fetchMock.mock.calls.map((c) => [c[0], c[1].method, c[1].body])).toEqual([
      [`${base}/sections/3/join-code`, 'POST', undefined],
      [`${base}/sections/3/requests/decision`, 'POST', JSON.stringify({ decision: 'approve', studentIds: [4, 5] })],
      [`${base}/sections/3/students/12/unlocks`, 'POST', JSON.stringify({ unitId: 9, reason: 'Reposo' })],
      [`${base}/sections/3/roster/preview`, 'POST', JSON.stringify({ csv: 'a,b' })],
      [`${base}/sections/3/roster`, 'POST', JSON.stringify({ csv: 'a,b' })],
    ]);
  });

  it('passes the server error through', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(404, { error: { code: 'SECTION_NOT_FOUND', message: 'No encontramos esta sección.' } }),
    );
    const err = await teacherApi.section('tok', 7, 3).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 404, code: 'SECTION_NOT_FOUND', message: 'No encontramos esta sección.' });
  });
});
