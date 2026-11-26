// Gestión académica (35) routes of memora-api (memora-api src/academic/academic.routes.ts). The active institution
// goes in the path (/institutions/:id/academic/...), so the shared request helper is enough.
import { request } from './client';

export type JoinMode = 'open' | 'approval' | 'roster';
export type TermStatus = 'open' | 'closed';

export type Area = { areaId: number; name: string };
export type Term = { termId: number; name: string; startsOn: string; endsOn: string; status: TermStatus };
export type Unit = { unitId: number; number: number; name: string };
export type Subject = { subjectId: number; code: string; name: string; units: Unit[] };
export type Section = {
  sectionId: number;
  subjectId: number;
  subjectCode: string;
  subjectName: string;
  termId: number;
  termName: string;
  name: string;
  joinCode: string;
  joinMode: JoinMode;
  capacity: number | null;
  /** "YYYY-MM-DDTHH:MM:SS" or null when the code does not expire. */
  codeExpiresAt: string | null;
  isArchived: boolean;
  teacherId: number | null;
  teacherName: string | null;
  studentCount: number;
};
export type Teacher = { userId: number; name: string };
export type PendingTeacher = { membershipId: number; userId: number; name: string; email: string; requestedAt: string };

export type AcademicOverview = {
  institutionName: string;
  /** Only the institution admin manages terms (RF-03). */
  canManageTerms: boolean;
  /** Every area for the institution admin, its own areas for an area admin. */
  areas: Area[];
  terms: Term[];
  pendingTeacherCount: number;
};

export type TermInput = { name: string; startsOn: string; endsOn: string };
export type TermPatch = Partial<TermInput> & { status?: TermStatus };
export type SubjectInput = { code: string; name: string };
export type UnitInput = { number: number; name: string };
export type SectionInput = {
  termId: number;
  name: string;
  joinMode?: JoinMode;
  capacity?: number | null;
  /** "YYYY-MM-DD" (end of that day) or null. */
  codeExpiresAt?: string | null;
  teacherId?: number | null;
};
export type SectionPatch = Partial<Omit<SectionInput, 'termId'>> & { isArchived?: boolean };

const base = (institutionId: number) => `/institutions/${institutionId}/academic`;

export const academicApi = {
  overview: (token: string, institutionId: number) =>
    request<{ academic: AcademicOverview }>(base(institutionId), { token }),

  createTerm: (token: string, institutionId: number, input: TermInput) =>
    request<{ term: Term }>(`${base(institutionId)}/terms`, { method: 'POST', body: input, token }),
  updateTerm: (token: string, institutionId: number, termId: number, patch: TermPatch) =>
    request<{ term: Term }>(`${base(institutionId)}/terms/${termId}`, { method: 'PATCH', body: patch, token }),
  deleteTerm: (token: string, institutionId: number, termId: number) =>
    request<void>(`${base(institutionId)}/terms/${termId}`, { method: 'DELETE', token }),

  subjects: (token: string, institutionId: number, areaId: number) =>
    request<{ subjects: Subject[] }>(`${base(institutionId)}/areas/${areaId}/subjects`, { token }),
  createSubject: (token: string, institutionId: number, areaId: number, input: SubjectInput) =>
    request<{ subject: Subject }>(`${base(institutionId)}/areas/${areaId}/subjects`, {
      method: 'POST',
      body: input,
      token,
    }),
  updateSubject: (token: string, institutionId: number, subjectId: number, patch: Partial<SubjectInput>) =>
    request<{ subject: Subject }>(`${base(institutionId)}/subjects/${subjectId}`, { method: 'PATCH', body: patch, token }),
  deleteSubject: (token: string, institutionId: number, subjectId: number) =>
    request<void>(`${base(institutionId)}/subjects/${subjectId}`, { method: 'DELETE', token }),

  createUnit: (token: string, institutionId: number, subjectId: number, input: UnitInput) =>
    request<{ unit: Unit }>(`${base(institutionId)}/subjects/${subjectId}/units`, { method: 'POST', body: input, token }),
  updateUnit: (token: string, institutionId: number, unitId: number, patch: Partial<UnitInput>) =>
    request<{ unit: Unit }>(`${base(institutionId)}/units/${unitId}`, { method: 'PATCH', body: patch, token }),
  deleteUnit: (token: string, institutionId: number, unitId: number) =>
    request<void>(`${base(institutionId)}/units/${unitId}`, { method: 'DELETE', token }),

  sections: (token: string, institutionId: number, areaId: number, termId?: number) =>
    request<{ sections: Section[] }>(
      `${base(institutionId)}/areas/${areaId}/sections${termId ? `?termId=${termId}` : ''}`,
      { token },
    ),
  createSection: (token: string, institutionId: number, subjectId: number, input: SectionInput) =>
    request<{ section: Section }>(`${base(institutionId)}/subjects/${subjectId}/sections`, {
      method: 'POST',
      body: input,
      token,
    }),
  updateSection: (token: string, institutionId: number, sectionId: number, patch: SectionPatch) =>
    request<{ section: Section }>(`${base(institutionId)}/sections/${sectionId}`, {
      method: 'PATCH',
      body: patch,
      token,
    }),
  renewSectionCode: (token: string, institutionId: number, sectionId: number) =>
    request<{ section: Section }>(`${base(institutionId)}/sections/${sectionId}/code`, { method: 'POST', token }),

  teachers: (token: string, institutionId: number) =>
    request<{ teachers: Teacher[] }>(`${base(institutionId)}/teachers`, { token }),
  pendingTeachers: (token: string, institutionId: number) =>
    request<{ teachers: PendingTeacher[] }>(`${base(institutionId)}/pending-teachers`, { token }),
  reviewTeacher: (token: string, institutionId: number, membershipId: number, decision: 'approve' | 'reject') =>
    request<{ membershipId: number; status: 'active' | 'rejected' }>(
      `${base(institutionId)}/pending-teachers/${membershipId}/${decision}`,
      { method: 'POST', token },
    ),
};

export type AcademicApi = typeof academicApi;
