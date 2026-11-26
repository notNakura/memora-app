import { API_URL, ApiError, authApi, NETWORK_ERROR_MESSAGE } from '../client';

const fetchMock = jest.fn();
beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

const jsonResponse = (status: number, body: unknown) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;
const noContent = () =>
  ({ ok: true, status: 204, json: async () => Promise.reject(new SyntaxError('no body')) }) as unknown as Response;

const session = { user: { id: 1 }, accessToken: 'a', refreshToken: 'r' };
const jsonHeaders = { Accept: 'application/json', 'Content-Type': 'application/json' };

describe('authApi', () => {
  it('posts JSON to the API and returns the body', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, session));
    const res = await authApi.login('ana@unerg.edu.ve', 'clave-segura');
    expect(res.accessToken).toBe('a');
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ email: 'ana@unerg.edu.ve', password: 'clave-segura' }),
    });
  });

  it('register sends only email and password', async () => {
    fetchMock.mockResolvedValue(jsonResponse(201, session));
    await authApi.register({ email: 'luis.perez@gmail.com', password: 'clave-segura' });
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ email: 'luis.perez@gmail.com', password: 'clave-segura' }),
    });
  });

  it('verifyEmail posts the code with the access token', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, session));
    const res = await authApi.verifyEmail('tok', '482015');
    expect(res.refreshToken).toBe('r');
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/auth/email/verify`, {
      method: 'POST',
      headers: { ...jsonHeaders, Authorization: 'Bearer tok' },
      body: JSON.stringify({ code: '482015' }),
    });
  });

  it('resendCode posts without a body and accepts 204', async () => {
    fetchMock.mockResolvedValue(noContent());
    await expect(authApi.resendCode('tok')).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/auth/email/resend`, {
      method: 'POST',
      headers: { Accept: 'application/json', Authorization: 'Bearer tok' },
      body: undefined,
    });
  });

  it('updateProfile puts the personal data with the access token', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, session));
    const data = { nationalId: 'V-20000001', firstNames: 'Luis', lastNames: 'Pérez', birthDate: null, sex: null };
    await authApi.updateProfile('tok', data);
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/me/profile`, {
      method: 'PUT',
      headers: { ...jsonHeaders, Authorization: 'Bearer tok' },
      body: JSON.stringify(data),
    });
  });

  it('sends the access token as Bearer for /me', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { user: { id: 1 } }));
    await authApi.me('tok');
    expect(fetchMock.mock.calls[0][1].headers).toEqual({ Accept: 'application/json', Authorization: 'Bearer tok' });
  });

  it('turns server errors into ApiError with code, message and fields', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(409, { error: { code: 'EMAIL_TAKEN', message: 'Ya existe…', fields: { email: 'Ya existe una cuenta con este correo.' } } }),
    );
    await expect(authApi.login('a@b.co', 'x')).rejects.toMatchObject({
      status: 409,
      code: 'EMAIL_TAKEN',
      message: 'Ya existe…',
      fields: { email: 'Ya existe una cuenta con este correo.' },
    });
  });

  it('keeps extra error data such as attemptsLeft and retryAfter', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(400, { error: { code: 'CODE_INVALID', message: 'El código no es correcto.', attemptsLeft: 3 } }),
    );
    const invalid = await authApi.verifyEmail('tok', '000000').catch((e) => e);
    expect(invalid.attemptsLeft).toBe(3);

    fetchMock.mockResolvedValueOnce(
      jsonResponse(429, { error: { code: 'RESEND_TOO_SOON', message: 'Espera un poco.', retryAfter: 42 } }),
    );
    const tooSoon = await authApi.resendCode('tok').catch((e) => e);
    expect(tooSoon).toBeInstanceOf(ApiError);
    expect(tooSoon.retryAfter).toBe(42);
  });

  it('reports a network failure in Spanish', async () => {
    fetchMock.mockRejectedValue(new TypeError('Network request failed'));
    const err = await authApi.refresh('r').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe('NETWORK');
    expect(err.message).toBe(NETWORK_ERROR_MESSAGE);
  });
});
