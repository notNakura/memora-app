// Institution administration routes (memora-api src/admin/admin.routes.ts):
// screens 34, 36 and 37. The institution goes in the path, so the shared request helper is enough; only
// the roster CSV goes as text/csv (it can be larger than the server's JSON limit).
import { API_URL, ApiError, NETWORK_ERROR_MESSAGE, request, type MembershipRole } from './client';

export type JoinMode = 'open' | 'approval' | 'roster';
export type MemberStatus = 'invited' | 'pending' | 'active' | 'rejected' | 'removed';

export type JoinSettings = {
  code: string;
  joinMode: JoinMode;
  /** Last day the code works (YYYY-MM-DD), or null. */
  codeExpiresOn: string | null;
  codeExpired: boolean;
  pendingCount: number;
};

export type AdminEntry = { membershipId: number; userId: number; name: string; areaId: number | null; areaName: string | null };
export type AreaEntry = {
  areaId: number;
  name: string;
  subjectCount: number;
  admins: { membershipId: number; userId: number; name: string }[];
};
export type Overview = { join: JoinSettings; areas: AreaEntry[]; admins: AdminEntry[] };
export type Candidate = { userId: number; name: string; email: string };

export type Member = {
  membershipId: number;
  userId: number;
  name: string;
  email: string;
  nationalId: string | null;
  role: MembershipRole;
  status: MemberStatus;
  areaId: number | null;
  areaName: string | null;
  emailEditable: boolean;
};

export type JoinRequest = {
  membershipId: number;
  userId: number;
  name: string;
  email: string;
  role: MembershipRole;
  areaId: number | null;
  requestedAt: string;
  inRoster: boolean;
};

export type RosterRow = {
  line: number;
  nationalId: string;
  firstNames: string;
  lastNames: string;
  email: string;
  role: 'student' | 'teacher' | null;
  section: string | null;
  outcome: 'created' | 'linked' | null;
  error: string | null;
};

export type RosterResult = {
  fileName: string | null;
  totalRows: number;
  created: number;
  loaded: number;
  errorCount: number;
  rows: RosterRow[];
};

export type LastImport = {
  occurredAt: string;
  actorName: string;
  fileName: string | null;
  totalRows: number;
  created: number;
  loaded: number;
  errors: { line: number; nationalId: string; message: string }[];
};

export type ReportedDeck = {
  deckId: number;
  name: string;
  visibility: 'section' | 'institution';
  authorName: string;
  cardCount: number;
  studentCount: number;
  reportCount: number;
  isHidden: boolean;
};
export type ReportedCard = { cardId: number; deckId: number; deckName: string; front: string; reportCount: number; isHidden: boolean };

export type AuditEntry = {
  auditId: string;
  occurredAt: string;
  userId: number;
  actorName: string;
  action: string;
  tableName: string;
  recordId: string;
  oldValue: unknown;
  newValue: unknown;
};
export type AuditPage = { entries: AuditEntry[]; nextBefore: string | null };
export type AuditFilters = { action?: string; from?: string; to?: string; before?: string; limit?: number };
export type MemberFilters = { q?: string; role?: MembershipRole; status?: MemberStatus };

const base = (institutionId: number) => `/admin/institutions/${institutionId}`;

const query = (params: Record<string, string | number | undefined>) => {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`);
  return parts.length ? `?${parts.join('&')}` : '';
};

/** POST of the roster file as text/csv, with the same error handling as request(). */
async function postCsv<T>(path: string, token: string, csv: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'text/csv', Authorization: `Bearer ${token}` },
      body: csv,
    });
  } catch {
    throw new ApiError(0, 'NETWORK', NETWORK_ERROR_MESSAGE);
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = data?.error;
    throw new ApiError(
      res.status,
      err?.code ?? 'UNKNOWN',
      err?.message ?? 'Ocurrió un error inesperado. Intenta de nuevo.',
      err?.fields ?? {},
    );
  }
  return data as T;
}

export const adminApi = {
  // Áreas y administradores (34)
  overview: (token: string, institutionId: number) => request<Overview>(`${base(institutionId)}/overview`, { token }),
  candidates: (token: string, institutionId: number) =>
    request<{ candidates: Candidate[] }>(`${base(institutionId)}/admin-candidates`, { token }),
  createArea: (token: string, institutionId: number, name: string) =>
    request<{ area: { areaId: number; name: string } }>(`${base(institutionId)}/areas`, { method: 'POST', body: { name }, token }),
  renameArea: (token: string, institutionId: number, areaId: number, name: string) =>
    request<{ area: { areaId: number; name: string } }>(`${base(institutionId)}/areas/${areaId}`, {
      method: 'PATCH',
      body: { name },
      token,
    }),
  deleteArea: (token: string, institutionId: number, areaId: number) =>
    request<void>(`${base(institutionId)}/areas/${areaId}`, { method: 'DELETE', token }),
  assignAdmin: (token: string, institutionId: number, userId: number, areaId: number | null) =>
    request<{ admin: AdminEntry }>(`${base(institutionId)}/admins`, { method: 'POST', body: { userId, areaId }, token }),
  removeAdmin: (token: string, institutionId: number, membershipId: number) =>
    request<void>(`${base(institutionId)}/admins/${membershipId}`, { method: 'DELETE', token }),
  updateJoin: (token: string, institutionId: number, patch: { joinMode?: JoinMode; codeExpiresOn?: string | null }) =>
    request<{ join: JoinSettings }>(`${base(institutionId)}/join`, { method: 'PATCH', body: patch, token }),
  regenerateCode: (token: string, institutionId: number) =>
    request<{ join: JoinSettings }>(`${base(institutionId)}/join/code`, { method: 'POST', token }),

  // Usuarios (36)
  members: (token: string, institutionId: number, filters: MemberFilters = {}) =>
    request<{ members: Member[] }>(`${base(institutionId)}/members${query(filters)}`, { token }),
  requests: (token: string, institutionId: number) =>
    request<{ requests: JoinRequest[] }>(`${base(institutionId)}/requests`, { token }),
  decide: (token: string, institutionId: number, membershipIds: number[], decision: 'approve' | 'reject') =>
    request<{ updated: number }>(`${base(institutionId)}/requests/decide`, {
      method: 'POST',
      body: { membershipIds, decision },
      token,
    }),
  changeRole: (token: string, institutionId: number, membershipId: number, role: 'student' | 'teacher') =>
    request<{ member: Member }>(`${base(institutionId)}/members/${membershipId}/role`, { method: 'PATCH', body: { role }, token }),
  removeMember: (token: string, institutionId: number, membershipId: number) =>
    request<{ member: Member }>(`${base(institutionId)}/members/${membershipId}/remove`, { method: 'POST', token }),
  reinstateMember: (token: string, institutionId: number, membershipId: number) =>
    request<{ member: Member }>(`${base(institutionId)}/members/${membershipId}/reinstate`, { method: 'POST', token }),
  correctEmail: (token: string, institutionId: number, userId: number, email: string) =>
    request<{ user: { userId: number; email: string } }>(`${base(institutionId)}/users/${userId}/email`, {
      method: 'PATCH',
      body: { email },
      token,
    }),
  previewRoster: (token: string, institutionId: number, csv: string) =>
    postCsv<{ roster: RosterResult }>(`${base(institutionId)}/roster/preview`, token, csv),
  importRoster: (token: string, institutionId: number, csv: string, fileName: string | null) =>
    postCsv<{ roster: RosterResult }>(`${base(institutionId)}/roster/import${query({ fileName: fileName ?? undefined })}`, token, csv),
  lastImport: (token: string, institutionId: number) =>
    request<{ lastImport: LastImport | null }>(`${base(institutionId)}/roster/last-import`, { token }),

  // Moderación y bitácora (37)
  reported: (token: string, institutionId: number) =>
    request<{ decks: ReportedDeck[]; cards: ReportedCard[] }>(`${base(institutionId)}/moderation`, { token }),
  deckAction: (token: string, institutionId: number, deckId: number, action: 'hide' | 'restore' | 'keep') =>
    request<{ deck: { deckId: number; isHidden: boolean } }>(`${base(institutionId)}/moderation/decks/${deckId}/${action}`, {
      method: 'POST',
      token,
    }),
  cardAction: (token: string, institutionId: number, cardId: number, action: 'hide' | 'restore') =>
    request<{ card: { cardId: number; isHidden: boolean } }>(`${base(institutionId)}/moderation/cards/${cardId}/${action}`, {
      method: 'POST',
      token,
    }),
  audit: (token: string, institutionId: number, filters: AuditFilters = {}) =>
    request<AuditPage>(`${base(institutionId)}/audit${query(filters)}`, { token }),
};

export type AdminApi = typeof adminApi;
