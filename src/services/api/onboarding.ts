// Onboarding routes of memora-api: guide, joining sections and institutions,
// registering an institution. Errors come back as ApiError through the shared request helper.
import { request, type InstitutionType, type User } from './client';

export type JoinOutcome = 'active' | 'pending' | 'already';
export type JoinRole = 'student' | 'teacher';

export type SectionPreview = {
  code: string;
  institutionName: string;
  areaName: string | null;
  subjectName: string;
  sectionName: string;
  termName: string | null;
  teacherName: string | null;
  deckCount: number;
  assessmentCount: number;
  outcome: JoinOutcome;
};

export type InstitutionPreview = { code: string; name: string; type: InstitutionType; outcome: JoinOutcome };

export type RegisterInstitutionInput = { name: string; type: InstitutionType; confirmDuplicate?: boolean };

export type RegisteredInstitution = { id: number; name: string; type: InstitutionType; joinCode: string };

export type JoinResult = { result: JoinOutcome; user: User };

export const onboardingApi = {
  completeOnboarding: (accessToken: string) =>
    request<{ user: User }>('/me', { method: 'PATCH', body: { onboardingCompleted: true }, token: accessToken }),
  sectionByCode: (accessToken: string, code: string) =>
    request<{ section: SectionPreview }>(`/sections/by-code/${encodeURIComponent(code)}`, { token: accessToken }),
  joinSection: (accessToken: string, code: string) =>
    request<JoinResult>('/sections/join', { method: 'POST', body: { code }, token: accessToken }),
  institutionByCode: (accessToken: string, code: string, role: JoinRole) =>
    request<{ institution: InstitutionPreview }>(
      `/institutions/by-code/${encodeURIComponent(code)}?role=${role}`,
      { token: accessToken },
    ),
  joinInstitution: (accessToken: string, code: string, role: JoinRole) =>
    request<JoinResult>('/institutions/join', { method: 'POST', body: { code, role }, token: accessToken }),
  registerInstitution: (accessToken: string, input: RegisterInstitutionInput) =>
    request<{ institution: RegisteredInstitution; user: User }>('/institutions', {
      method: 'POST',
      body: input,
      token: accessToken,
    }),
};

export type OnboardingApi = typeof onboardingApi;
