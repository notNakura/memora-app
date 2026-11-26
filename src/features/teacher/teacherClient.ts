// The teacher API bound to one institution and to the session's token runner (withAccess), so screens 24-28
// (and a future wide web layout) only see plain async calls and tests can fake them.
import type { Membership } from '../../services/api/client';
import {
  teacherApi,
  type JoinRequest,
  type JoinSettingsPatch,
  type RequestsSummary,
  type RosterImport,
  type RosterPreview,
  type RosterStudent,
  type SectionHeader,
  type SectionSummary,
  type StudentPerformance,
  type TeacherApi,
} from '../../services/api/teacher';

export type TeacherClient = {
  sections(): Promise<SectionSummary[]>;
  section(sectionId: number): Promise<{ section: SectionHeader; students: RosterStudent[] }>;
  updateJoinSettings(sectionId: number, patch: JoinSettingsPatch): Promise<SectionHeader>;
  regenerateCode(sectionId: number): Promise<SectionHeader>;
  requests(sectionId: number): Promise<{ section: SectionHeader; summary: RequestsSummary; requests: JoinRequest[] }>;
  decide(sectionId: number, decision: 'approve' | 'reject', studentIds: number[]): Promise<number>;
  student(sectionId: number, studentId: number): Promise<StudentPerformance>;
  unlockUnit(sectionId: number, studentId: number, unitId: number, reason: string): Promise<void>;
  previewRoster(sectionId: number, csv: string): Promise<RosterPreview>;
  importRoster(sectionId: number, csv: string): Promise<RosterImport>;
};

export type AccessRunner = <T>(call: (token: string) => Promise<T>) => Promise<T>;

export function bindTeacherApi(run: AccessRunner, institutionId: number, api: TeacherApi = teacherApi): TeacherClient {
  const i = institutionId;
  return {
    sections: async () => (await run((t) => api.sections(t, i))).sections,
    section: (sectionId) => run((t) => api.section(t, i, sectionId)),
    updateJoinSettings: async (sectionId, patch) => (await run((t) => api.updateJoinSettings(t, i, sectionId, patch))).section,
    regenerateCode: async (sectionId) => (await run((t) => api.regenerateCode(t, i, sectionId))).section,
    requests: (sectionId) => run((t) => api.requests(t, i, sectionId)),
    decide: async (sectionId, decision, ids) => (await run((t) => api.decide(t, i, sectionId, decision, ids))).decided,
    student: (sectionId, studentId) => run((t) => api.student(t, i, sectionId, studentId)),
    unlockUnit: async (sectionId, studentId, unitId, reason) => {
      await run((t) => api.unlockUnit(t, i, sectionId, studentId, unitId, reason));
    },
    previewRoster: (sectionId, csv) => run((t) => api.previewRoster(t, i, sectionId, csv)),
    importRoster: (sectionId, csv) => run((t) => api.importRoster(t, i, sectionId, csv)),
  };
}

/**
 * Institution of the teacher view: the active one (screen 22) when the person is an active teacher there,
 * otherwise the first institution where they are an active teacher, or null.
 */
export function teacherInstitutionFor(memberships: Membership[], activeInstitutionId: number | null): number | null {
  const teaching = memberships.filter((m) => m.role === 'teacher' && m.status === 'active');
  const active = teaching.find((m) => m.institutionId === activeInstitutionId);
  return (active ?? teaching[0])?.institutionId ?? null;
}
