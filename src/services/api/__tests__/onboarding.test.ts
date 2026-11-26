import { API_URL, ApiError } from '../client';
import { onboardingApi } from '../onboarding';

const fetchMock = jest.fn();
beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

const jsonResponse = (status: number, body: unknown) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;

const jsonHeaders = { Accept: 'application/json', 'Content-Type': 'application/json' };
const auth = { Authorization: 'Bearer tok' };
const user = { id: 1 };

describe('onboardingApi', () => {
  it('completeOnboarding patches /me', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { user }));
    await expect(onboardingApi.completeOnboarding('tok')).resolves.toEqual({ user });
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/me`, {
      method: 'PATCH',
      headers: { ...jsonHeaders, ...auth },
      body: JSON.stringify({ onboardingCompleted: true }),
    });
  });

  it('sectionByCode gets the preview with the code in the path', async () => {
    const section = { code: 'SK3A26', institutionName: 'UNERG', outcome: 'active' };
    fetchMock.mockResolvedValue(jsonResponse(200, { section }));
    await expect(onboardingApi.sectionByCode('tok', 'SK3A26')).resolves.toEqual({ section });
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/sections/by-code/SK3A26`, {
      method: 'GET',
      headers: { Accept: 'application/json', ...auth },
      body: undefined,
    });
  });

  it('joinSection posts the code', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { result: 'pending', user }));
    await expect(onboardingApi.joinSection('tok', 'SK3A26')).resolves.toEqual({ result: 'pending', user });
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/sections/join`, {
      method: 'POST',
      headers: { ...jsonHeaders, ...auth },
      body: JSON.stringify({ code: 'SK3A26' }),
    });
  });

  it('institutionByCode sends the requested role as query', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { institution: { code: 'K7M2P9QA' } }));
    await onboardingApi.institutionByCode('tok', 'K7M2P9QA', 'teacher');
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/institutions/by-code/K7M2P9QA?role=teacher`, {
      method: 'GET',
      headers: { Accept: 'application/json', ...auth },
      body: undefined,
    });
  });

  it('joinInstitution posts the code and the role', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { result: 'active', user }));
    await onboardingApi.joinInstitution('tok', 'K7M2P9QA', 'student');
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/institutions/join`, {
      method: 'POST',
      headers: { ...jsonHeaders, ...auth },
      body: JSON.stringify({ code: 'K7M2P9QA', role: 'student' }),
    });
  });

  it('registerInstitution posts name, type and the duplicate confirmation', async () => {
    const institution = { id: 3, name: 'UNERG', type: 'university', joinCode: 'K7M2P9QA' };
    fetchMock.mockResolvedValue(jsonResponse(201, { institution, user }));
    await expect(
      onboardingApi.registerInstitution('tok', { name: 'UNERG', type: 'university', confirmDuplicate: true }),
    ).resolves.toEqual({ institution, user });
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/institutions`, {
      method: 'POST',
      headers: { ...jsonHeaders, ...auth },
      body: JSON.stringify({ name: 'UNERG', type: 'university', confirmDuplicate: true }),
    });
  });

  it.each([
    [404, 'JOIN_CODE_NOT_FOUND', 'No encontramos ese código. Revísalo e intenta de nuevo.'],
    [410, 'JOIN_CODE_EXPIRED', 'Ese código ya venció. Pide uno nuevo a tu institución.'],
    [403, 'INSTITUTION_SUSPENDED', 'Esta institución no está disponible por ahora.'],
    [409, 'SECTION_FULL', 'Esta sección ya no tiene cupo.'],
    [409, 'INSTITUTION_NAME_TAKEN', 'Ya existe una institución con ese nombre. Confirma que se trata de otra.'],
    [429, 'TOO_MANY_ATTEMPTS', 'Demasiados intentos.'],
  ])('maps %i %s to ApiError like the other routes', async (status, code, message) => {
    fetchMock.mockResolvedValue(jsonResponse(status, { error: { code, message } }));
    const err = await onboardingApi.joinSection('tok', 'SK3A26').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status, code, message });
  });

  it('a network failure becomes the NETWORK ApiError', async () => {
    fetchMock.mockRejectedValue(new TypeError('Network request failed'));
    await expect(onboardingApi.sectionByCode('tok', 'SK3A26')).rejects.toMatchObject({ code: 'NETWORK' });
  });
});
