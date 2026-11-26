// The academic API bound to one institution and to a way of getting an access token, so the screen
// (and a future wide web layout) only sees plain async calls and tests can fake them.
import {
  academicApi,
  type AcademicApi,
  type AcademicOverview,
  type PendingTeacher,
  type Section,
  type SectionInput,
  type SectionPatch,
  type Subject,
  type SubjectInput,
  type Teacher,
  type Term,
  type TermInput,
  type TermPatch,
  type Unit,
  type UnitInput,
} from '../../services/api/academic';
import { ApiError, authApi, type AuthApi, type Membership } from '../../services/api/client';
import { tokenStore as defaultTokenStore, type TokenStore } from '../../services/tokenStore';

export type AcademicClient = {
  overview(): Promise<AcademicOverview>;
  sections(areaId: number, termId?: number): Promise<Section[]>;
  subjects(areaId: number): Promise<Subject[]>;
  teachers(): Promise<Teacher[]>;
  pendingTeachers(): Promise<PendingTeacher[]>;
  reviewTeacher(membershipId: number, decision: 'approve' | 'reject'): Promise<void>;
  createTerm(input: TermInput): Promise<Term>;
  updateTerm(termId: number, patch: TermPatch): Promise<Term>;
  createSubject(areaId: number, input: SubjectInput): Promise<Subject>;
  updateSubject(subjectId: number, patch: Partial<SubjectInput>): Promise<Subject>;
  deleteSubject(subjectId: number): Promise<void>;
  createUnit(subjectId: number, input: UnitInput): Promise<Unit>;
  deleteUnit(unitId: number): Promise<void>;
  createSection(subjectId: number, input: SectionInput): Promise<Section>;
  updateSection(sectionId: number, patch: SectionPatch): Promise<Section>;
  renewSectionCode(sectionId: number): Promise<Section>;
};

/** Runs an API call with a valid access token. */
export type AccessRunner = <T>(call: (token: string) => Promise<T>) => Promise<T>;

const sessionExpired = () => new ApiError(401, 'SESSION_EXPIRED', 'Tu sesión terminó. Inicia sesión de nuevo.');

/**
 * Access tokens from the saved refresh token (the session keeps its own in memory and does not expose
 * it): one refresh, reused until the server answers 401, then one more refresh and one retry.
 */
export function createAccessRunner(store: TokenStore = defaultTokenStore, api: Pick<AuthApi, 'refresh'> = authApi): AccessRunner {
  let token: string | null = null;
  const renew = async () => {
    const saved = await store.get();
    if (!saved) throw sessionExpired();
    token = (await api.refresh(saved)).accessToken;
    return token;
  };
  return async (call) => {
    if (token) {
      try {
        return await call(token);
      } catch (err) {
        if (!(err instanceof ApiError) || err.status !== 401) throw err;
      }
    }
    return call(await renew());
  };
}

export function bindAcademicApi(run: AccessRunner, institutionId: number, api: AcademicApi = academicApi): AcademicClient {
  const id = institutionId;
  return {
    overview: async () => (await run((t) => api.overview(t, id))).academic,
    sections: async (areaId, termId) => (await run((t) => api.sections(t, id, areaId, termId))).sections,
    subjects: async (areaId) => (await run((t) => api.subjects(t, id, areaId))).subjects,
    teachers: async () => (await run((t) => api.teachers(t, id))).teachers,
    pendingTeachers: async () => (await run((t) => api.pendingTeachers(t, id))).teachers,
    reviewTeacher: async (membershipId, decision) => {
      await run((t) => api.reviewTeacher(t, id, membershipId, decision));
    },
    createTerm: async (input) => (await run((t) => api.createTerm(t, id, input))).term,
    updateTerm: async (termId, patch) => (await run((t) => api.updateTerm(t, id, termId, patch))).term,
    createSubject: async (areaId, input) => (await run((t) => api.createSubject(t, id, areaId, input))).subject,
    updateSubject: async (subjectId, patch) => (await run((t) => api.updateSubject(t, id, subjectId, patch))).subject,
    deleteSubject: (subjectId) => run((t) => api.deleteSubject(t, id, subjectId)),
    createUnit: async (subjectId, input) => (await run((t) => api.createUnit(t, id, subjectId, input))).unit,
    deleteUnit: (unitId) => run((t) => api.deleteUnit(t, id, unitId)),
    createSection: async (subjectId, input) => (await run((t) => api.createSection(t, id, subjectId, input))).section,
    updateSection: async (sectionId, patch) => (await run((t) => api.updateSection(t, id, sectionId, patch))).section,
    renewSectionCode: async (sectionId) => (await run((t) => api.renewSectionCode(t, id, sectionId))).section,
  };
}

/**
 * Institution whose Gestión académica opens: the active one (screen 22) when the person holds `role`
 * there, otherwise the first institution where they hold it; null without such a membership.
 */
export function academicInstitutionFor(
  memberships: Membership[],
  activeInstitutionId: number | null,
  role: 'institution_admin' | 'area_admin',
): number | null {
  const held = memberships.filter((m) => m.role === role && m.status === 'active');
  return (held.find((m) => m.institutionId === activeInstitutionId) ?? held[0])?.institutionId ?? null;
}
