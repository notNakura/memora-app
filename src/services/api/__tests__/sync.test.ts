import { API_URL } from '../client';
import { syncApi } from '../sync';

const fetchMock = jest.fn();
beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

const jsonResponse = (status: number, body: unknown) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;

describe('syncApi', () => {
  it('pull sends the cursor and the access token', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { cursor: 'c2', tables: {} }));
    const res = await syncApi.pull('tok', '2026-11-20T12:00:00.000000');
    expect(res.cursor).toBe('c2');
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/sync/pull?since=2026-11-20T12%3A00%3A00.000000`, {
      method: 'GET',
      headers: { Accept: 'application/json', Authorization: 'Bearer tok' },
      body: undefined,
    });
  });

  it('pull without a cursor asks for everything', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { cursor: 'c1', tables: {} }));
    await syncApi.pull('tok', null);
    expect(fetchMock.mock.calls[0][0]).toBe(`${API_URL}/sync/pull`);
  });

  it('push posts the batch', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { results: [], conflicts: 0 }));
    const body = { device: 'Android', changes: [] };
    await syncApi.push('tok', body);
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/sync/push`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: 'Bearer tok' },
      body: JSON.stringify(body),
    });
  });
});
