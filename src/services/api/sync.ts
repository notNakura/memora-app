// Sync endpoints of memora-api (docs/07_sincronizacion.md).
import { request } from './client';

export type SyncRow = Record<string, unknown>;
export type ChangeOp = 'insert' | 'update' | 'delete';

/** One pending_change on its way up; `id` is the local change_id, echoed back in the result. */
export type OutgoingChange = { id: number; table: string; op: ChangeOp; recordId: string; payload: SyncRow };
export type PushRequest = { device: string; changes: OutgoingChange[] };
export type ChangeResult = {
  id: number;
  status: 'applied' | 'duplicate' | 'rejected';
  /** Spanish reason, only for rejected changes. */
  reason?: string;
  /** Conflict rule kept the server's newer state; the change is settled anyway. */
  conflict?: true;
  /** Id the server assigned (error_report). */
  serverId?: number;
};
export type PushResponse = { results: ChangeResult[]; conflicts: number };
/** Rows per table the caller may hold on the phone, and the cursor to send next time. */
export type PullResponse = { cursor: string; tables: Record<string, SyncRow[]> };

export const syncApi = {
  pull: (accessToken: string, since: string | null) =>
    request<PullResponse>(since ? `/sync/pull?since=${encodeURIComponent(since)}` : '/sync/pull', {
      token: accessToken,
    }),
  push: (accessToken: string, body: PushRequest) =>
    request<PushResponse>('/sync/push', { method: 'POST', body, token: accessToken }),
};

export type SyncApi = typeof syncApi;
