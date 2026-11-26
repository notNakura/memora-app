// Teacher panel routes of memora-api (memora-api src/teacher/teacher.routes.ts). The active institution goes in the
// path (/institutions/:id/teacher/...), so `request` needs no extra header. Birth date and sex never come back.
import { request } from './client';

export type JoinMode = 'open' | 'approval' | 'roster';
export type AttentionReason = 'below_minimum' | 'inactive' | 'plan_incomplete' | 'assessment_missing';

export type UnitMastery = { unitId: number; number: number; name: string; mastery: number | null };

export type SectionHeader = {
  sectionId: number;
  subjectCode: string;
  subjectName: string;
  sectionName: string;
  termName: string;
  joinCode: string;
  /** memora.app/u/<CODE> (docs/01_producto.md). */
  inviteLink: string;
  joinMode: JoinMode;
  capacity: number | null;
  /** 'YYYY-MM-DD': the code works until 23:59 of that day; null when it does not expire. */
  codeExpiresOn: string | null;
  codeExpired: boolean;
  activeCount: number;
  pendingCount: number;
  invitedCount: number;
};

/** Panel docente (24): a section card. */
export type SectionSummary = Omit<SectionHeader, 'joinCode' | 'inviteLink'> & {
  pendingEndorsementCount: number;
  units: UnitMastery[];
};

export type RosterStudent = {
  studentId: number;
  name: string;
  /** 0-100, or null when the student has not reviewed the section's cards yet. */
  mastery: number | null;
  lastReviewAt: string | null;
  daysSinceReview: number | null;
  attention: AttentionReason[];
};

export type JoinRequest = {
  studentId: number;
  name: string;
  nationalId: string | null;
  email: string;
  requestedAt: string;
  /** Their cédula is on the section's list under another email (screen 27). */
  onRoster: boolean;
};

export type RequestsSummary = { pending: number; onRoster: number; notOnRoster: number; active: number };

export type StudentPerformance = {
  student: { studentId: number; name: string; nationalId: string | null; extendedTime: boolean };
  overall: number | null;
  units: (UnitMastery & { unlocked: boolean })[];
  lastReviewAt: string | null;
  daysSinceReview: number | null;
  /** Reviews per day, last 7 days, oldest first. */
  activity: { day: string; reviews: number }[];
  assessments: { assessmentId: number; title: string; attemptNumber: number; masteryPct: number | null; grade: number | null }[];
  hardestCards: { cardId: number; front: string; lapses: number }[];
  streak: { currentDays: number; bestStreak: number } | null;
  plan: { day: number; days: number; completed: boolean } | null;
};

export type RosterRow = {
  line: number;
  nationalId: string;
  firstNames: string;
  lastNames: string;
  email: string;
  status: 'new' | 'existing' | 'enrolled' | 'error';
  error?: string;
};

export type RosterPreview = { rows: RosterRow[]; validCount: number; errorCount: number };
export type RosterImport = {
  rows: RosterRow[];
  imported: number;
  created: number;
  invited: number;
  activated: number;
  errorCount: number;
};

export type JoinSettingsPatch = { joinMode?: JoinMode; capacity?: number | null; codeExpiresOn?: string | null };

const base = (institutionId: number) => `/institutions/${institutionId}/teacher`;
const sectionPath = (institutionId: number, sectionId: number) => `${base(institutionId)}/sections/${sectionId}`;

export const teacherApi = {
  sections: (token: string, institutionId: number) =>
    request<{ sections: SectionSummary[] }>(`${base(institutionId)}/sections`, { token }),
  section: (token: string, institutionId: number, sectionId: number) =>
    request<{ section: SectionHeader; students: RosterStudent[] }>(sectionPath(institutionId, sectionId), { token }),
  updateJoinSettings: (token: string, institutionId: number, sectionId: number, patch: JoinSettingsPatch) =>
    request<{ section: SectionHeader }>(`${sectionPath(institutionId, sectionId)}/join-settings`, {
      method: 'PATCH',
      body: patch,
      token,
    }),
  regenerateCode: (token: string, institutionId: number, sectionId: number) =>
    request<{ section: SectionHeader }>(`${sectionPath(institutionId, sectionId)}/join-code`, { method: 'POST', token }),
  requests: (token: string, institutionId: number, sectionId: number) =>
    request<{ section: SectionHeader; summary: RequestsSummary; requests: JoinRequest[] }>(
      `${sectionPath(institutionId, sectionId)}/requests`,
      { token },
    ),
  decide: (token: string, institutionId: number, sectionId: number, decision: 'approve' | 'reject', studentIds: number[]) =>
    request<{ decided: number }>(`${sectionPath(institutionId, sectionId)}/requests/decision`, {
      method: 'POST',
      body: { decision, studentIds },
      token,
    }),
  student: (token: string, institutionId: number, sectionId: number, studentId: number) =>
    request<StudentPerformance>(`${sectionPath(institutionId, sectionId)}/students/${studentId}`, { token }),
  unlockUnit: (token: string, institutionId: number, sectionId: number, studentId: number, unitId: number, reason: string) =>
    request<{ unlock: { unitId: number; grantedAt: string } }>(
      `${sectionPath(institutionId, sectionId)}/students/${studentId}/unlocks`,
      { method: 'POST', body: { unitId, reason }, token },
    ),
  previewRoster: (token: string, institutionId: number, sectionId: number, csv: string) =>
    request<RosterPreview>(`${sectionPath(institutionId, sectionId)}/roster/preview`, { method: 'POST', body: { csv }, token }),
  importRoster: (token: string, institutionId: number, sectionId: number, csv: string) =>
    request<RosterImport>(`${sectionPath(institutionId, sectionId)}/roster`, { method: 'POST', body: { csv }, token }),
};

export type TeacherApi = typeof teacherApi;
