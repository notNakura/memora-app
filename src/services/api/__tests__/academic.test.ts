import { API_URL, ApiError } from '../client';
import { academicApi } from '../academic';

const fetchMock = jest.fn();
beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

const jsonResponse = (status: number, body: unknown) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;

const auth = { Authorization: 'Bearer tok' };
const getHeaders = { Accept: 'application/json', ...auth };
const jsonHeaders = { Accept: 'application/json', 'Content-Type': 'application/json', ...auth };
const base = `${API_URL}/institutions/7/academic`;

describe('academicApi', () => {
  it('gets the overview of the active institution from the path', async () => {
    const academic = { institutionName: 'UNERG', canManageTerms: true, areas: [], terms: [], pendingTeacherCount: 2 };
    fetchMock.mockResolvedValue(jsonResponse(200, { academic }));
    await expect(academicApi.overview('tok', 7)).resolves.toEqual({ academic });
    expect(fetchMock).toHaveBeenCalledWith(base, { method: 'GET', headers: getHeaders, body: undefined });
  });

  it('closes a term with PATCH status', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { term: { termId: 3, status: 'closed' } }));
    await academicApi.updateTerm('tok', 7, 3, { status: 'closed' });
    expect(fetchMock).toHaveBeenCalledWith(`${base}/terms/3`, {
      method: 'PATCH',
      headers: jsonHeaders,
      body: JSON.stringify({ status: 'closed' }),
    });
  });

  it('lists sections of an area for a term', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { sections: [] }));
    await academicApi.sections('tok', 7, 2, 3);
    expect(fetchMock).toHaveBeenCalledWith(`${base}/areas/2/sections?termId=3`, {
      method: 'GET',
      headers: getHeaders,
      body: undefined,
    });
  });

  it('creates a section under its subject', async () => {
    fetchMock.mockResolvedValue(jsonResponse(201, { section: { sectionId: 9 } }));
    const input = { termId: 3, name: 'Sección 1', teacherId: 4, capacity: 40 };
    await academicApi.createSection('tok', 7, 5, input);
    expect(fetchMock).toHaveBeenCalledWith(`${base}/subjects/5/sections`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(input),
    });
  });

  it('renews a section code and reviews a pending teacher', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { section: { sectionId: 9 } }));
    await academicApi.renewSectionCode('tok', 7, 9);
    expect(fetchMock).toHaveBeenLastCalledWith(`${base}/sections/9/code`, {
      method: 'POST',
      headers: getHeaders,
      body: undefined,
    });
    fetchMock.mockResolvedValue(jsonResponse(200, { membershipId: 11, status: 'rejected' }));
    await expect(academicApi.reviewTeacher('tok', 7, 11, 'reject')).resolves.toEqual({
      membershipId: 11,
      status: 'rejected',
    });
    expect(fetchMock).toHaveBeenLastCalledWith(`${base}/pending-teachers/11/reject`, {
      method: 'POST',
      headers: getHeaders,
      body: undefined,
    });
  });

  it('deletes a subject (204) and passes server errors through', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 204, json: async () => null } as Response);
    await expect(academicApi.deleteSubject('tok', 7, 5)).resolves.toBeUndefined();
    fetchMock.mockResolvedValue(
      jsonResponse(403, { error: { code: 'ROLE_REQUIRED', message: 'No tienes permiso para hacer esto en esta institución.' } }),
    );
    await expect(academicApi.createTerm('tok', 7, { name: '2027-I', startsOn: '2027-03-01', endsOn: '2027-07-15' })).rejects.toEqual(
      new ApiError(403, 'ROLE_REQUIRED', 'No tienes permiso para hacer esto en esta institución.'),
    );
  });
});
