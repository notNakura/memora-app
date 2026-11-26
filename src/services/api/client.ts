// HTTP client for memora-api (routes under memora-api src/).
// Screens never call fetch directly; they go through the session.
export type MembershipRole = 'student' | 'teacher' | 'area_admin' | 'institution_admin';
export type MembershipStatus = 'invited' | 'pending' | 'active' | 'rejected' | 'removed';
export type Sex = 'male' | 'female' | 'unspecified';
export type InstitutionType = 'university' | 'institute' | 'course';
export type EnrollmentStatus = 'invited' | 'pending' | 'active';

export type Membership = {
  institutionId: number;
  institutionName: string;
  role: MembershipRole;
  status: MembershipStatus;
  areaId: number | null;
  /** Added with onboarding; optional so an older server still works. */
  institutionType?: InstitutionType;
  /** Active enrollments of this user in that institution. */
  sectionCount?: number;
};

/** A section the user is invited to, waiting for or enrolled in (onboarding routes). */
export type Enrollment = {
  sectionId: number;
  institutionId: number;
  subjectName: string;
  sectionName: string;
  /** Display name of the section's teacher (added with the profile screens); optional for an older server. */
  teacherName?: string | null;
  status: EnrollmentStatus;
};

/** Preferences of Perfil (21) and Ajustes y cuenta (23), columns of app_user (database/*.sql). */
export type Preferences = {
  /** 0.70-0.97 */
  desiredRetention: number;
  /** 1.00-3.00; 1 is "Tiempo normal". */
  timeFactor: number;
  /** 0-200 */
  dailyNewLimit: number;
  notificationsEnabled: boolean;
  vibrationEnabled: boolean;
  /** 'HH:MM' */
  reminderTime: string;
  showNamePublicly: boolean;
};

export type User = {
  id: number;
  email: string;
  emailVerified: boolean;
  profileComplete: boolean;
  nationalId: string | null;
  firstNames: string | null;
  lastNames: string | null;
  birthDate: string | null;
  sex: Sex | null;
  onboardingCompleted: boolean;
  memberships: Membership[];
  enrollments?: Enrollment[];
} & Partial<Preferences>; // optional so an older server (and older fixtures) still work

export type Session = { user: User; accessToken: string; refreshToken: string };

export type RegisterInput = { email: string; password: string };

export type ProfileInput = {
  nationalId: string;
  firstNames: string;
  lastNames: string;
  birthDate: string | null;
  sex: Sex | null;
};

/**
 * Error with the server's code, its Spanish message and per-field messages. Extra data the server adds
 * to the error object (attemptsLeft for CODE_INVALID, retryAfter in seconds for RESEND_TOO_SOON) is kept.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields: Record<string, string> = {},
    readonly attemptsLeft: number | null = null,
    readonly retryAfter: number | null = null,
  ) {
    super(message);
  }
}

export const NETWORK_ERROR_MESSAGE =
  'No pudimos conectar con Memora. Revisa tu conexión a internet e intenta de nuevo.';

/**
 * Base URL of the API. Set EXPO_PUBLIC_API_URL in .env (see .env.example):
 * the Android emulator reaches the PC at http://10.0.2.2:3000 and a phone needs the PC's LAN IP.
 */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');

const numberOrNull = (value: unknown) => (typeof value === 'number' ? value : null);

export async function request<T>(path: string, init: { method?: string; body?: unknown; token?: string } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: init.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'NETWORK', NETWORK_ERROR_MESSAGE);
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = data?.error;
    throw new ApiError(
      res.status,
      err?.code ?? 'UNKNOWN',
      err?.message ?? 'Ocurrió un error inesperado. Intenta de nuevo.',
      err?.fields ?? {},
      numberOrNull(err?.attemptsLeft),
      numberOrNull(err?.retryAfter),
    );
  }
  return data as T;
}

export const authApi = {
  register: (input: RegisterInput) =>
    request<Session>('/auth/register', { method: 'POST', body: { email: input.email, password: input.password } }),
  verifyEmail: (accessToken: string, code: string) =>
    request<Session>('/auth/email/verify', { method: 'POST', body: { code }, token: accessToken }),
  resendCode: (accessToken: string) =>
    request<void>('/auth/email/resend', { method: 'POST', token: accessToken }),
  updateProfile: (accessToken: string, input: ProfileInput) =>
    request<Session>('/me/profile', { method: 'PUT', body: input, token: accessToken }),
  login: (email: string, password: string) =>
    request<Session>('/auth/login', { method: 'POST', body: { email, password } }),
  refresh: (refreshToken: string) => request<Session>('/auth/refresh', { method: 'POST', body: { refreshToken } }),
  me: (accessToken: string) => request<{ user: User }>('/me', { token: accessToken }),
};

export type AuthApi = typeof authApi;
