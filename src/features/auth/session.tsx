// Session state for the whole app. The access token lives only in memory; the refresh token
// is persisted so the user stays signed in. Signing out deletes it from the device.
// The signup choice (student/teacher/institution) is kept only on the phone until the user has an active
// membership. The active institution (screen 22) is also kept only on the phone, with the role chosen
// there when that institution gives the person several roles.
// Onboarding routes (guide, joining, registering an institution) refresh the user from each response's `user`.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  activeInstitutionStore as defaultActiveStore,
  type ActiveInstitutionStore,
} from '../../services/activeInstitutionStore';
import {
  ApiError,
  authApi,
  type AuthApi,
  type MembershipRole,
  type ProfileInput,
  type Session,
  type User,
} from '../../services/api/client';
import {
  onboardingApi as defaultOnboardingApi,
  type InstitutionPreview,
  type JoinOutcome,
  type JoinRole,
  type OnboardingApi,
  type RegisteredInstitution,
  type RegisterInstitutionInput,
  type SectionPreview,
} from '../../services/api/onboarding';
import {
  signupChoiceStore as defaultChoiceStore,
  type SignupChoice,
  type SignupChoiceStore,
} from '../../services/signupChoiceStore';
import { tokenStore as defaultTokenStore, type TokenStore } from '../../services/tokenStore';
import { hasActiveMembership } from './startRoute';

type SessionState =
  | { status: 'loading'; user: null }
  | { status: 'signedOut'; user: null }
  | { status: 'signedIn'; user: User };

type SessionContextValue = SessionState & {
  /** Calls the API with the access token, renewing it once on 401 (used by the sync engine). */
  withAccess<T>(call: (token: string) => Promise<T>): Promise<T>;
  /** Keeps the user a route returned (preferences, leaving a section…) as the signed-in user. */
  applyUser(user: User): Promise<void>;
  /** Choice saved in step 1 on this phone, or null. */
  signupChoice: SignupChoice | null;
  /** Email to prefill in step 1 after "Cambiar correo". */
  lastEmail: string | null;
  register(email: string, password: string, choice: SignupChoice): Promise<void>;
  verifyEmail(code: string): Promise<void>;
  resendCode(): Promise<void>;
  completeProfile(data: ProfileInput): Promise<void>;
  signIn(email: string, password: string): Promise<void>;
  signOut(options?: { keepEmail?: boolean }): Promise<void>;
  /** Institution chosen on screen 22, or null (the widest role decides). */
  activeInstitutionId: number | null;
  /** Role chosen on screen 22 for the active institution, or null (the widest role decides). */
  activeRole: MembershipRole | null;
  /** Makes the institution active; `role` picks one of its roles (one row per role on screen 22). */
  setActiveInstitution(institutionId: number, role?: MembershipRole): Promise<void>;
  /** Finishing or skipping the guide (screen 4, RF-53). */
  completeOnboarding(): Promise<void>;
  previewSection(code: string): Promise<SectionPreview>;
  joinSection(code: string): Promise<JoinOutcome>;
  previewInstitution(code: string, role: JoinRole): Promise<InstitutionPreview>;
  joinInstitution(code: string, role: JoinRole): Promise<JoinOutcome>;
  /** Registers an institution (screen 33) and makes it the active one. */
  registerInstitution(input: RegisterInstitutionInput): Promise<RegisteredInstitution>;
};

/** Phone-only preferences must never break the session: a failing store (sync or async) is ignored. */
const quietly = <T,>(call: () => Promise<T>, fallback: T): Promise<T> =>
  Promise.resolve()
    .then(call)
    .catch(() => fallback);

const SessionContext = createContext<SessionContextValue | null>(null);

type Props = {
  children: ReactNode;
  api?: AuthApi;
  store?: TokenStore;
  choiceStore?: SignupChoiceStore;
  onboardingApi?: OnboardingApi;
  activeStore?: ActiveInstitutionStore;
};

export function SessionProvider({
  children,
  api = authApi,
  store = defaultTokenStore,
  choiceStore = defaultChoiceStore,
  onboardingApi = defaultOnboardingApi,
  activeStore = defaultActiveStore,
}: Props) {
  const [state, setState] = useState<SessionState>({ status: 'loading', user: null });
  const [signupChoice, setSignupChoice] = useState<SignupChoice | null>(null);
  const [lastEmail, setLastEmail] = useState<string | null>(null);
  const [activeInstitutionId, setActiveInstitutionId] = useState<number | null>(null);
  const [activeRole, setActiveRole] = useState<MembershipRole | null>(null);
  const accessToken = useRef<string | null>(null);

  /** Keeps the newest user; the signup choice is no longer needed once a membership is active. */
  const applyUser = useCallback(
    async (user: User) => {
      if (hasActiveMembership(user)) {
        await choiceStore.clear().catch(() => undefined);
        setSignupChoice(null);
      }
      setState({ status: 'signedIn', user });
    },
    [choiceStore],
  );

  const start = useCallback(
    async (session: Session) => {
      await store.set(session.refreshToken);
      accessToken.current = session.accessToken;
      setLastEmail(null);
      await applyUser(session.user);
    },
    [store, applyUser],
  );

  const chooseActiveInstitution = useCallback(
    async (institutionId: number, role?: MembershipRole) => {
      await quietly(() => activeStore.set(institutionId, role ?? null), undefined);
      setActiveInstitutionId(institutionId);
      setActiveRole(role ?? null);
    },
    [activeStore],
  );

  const endSession = useCallback(async () => {
    accessToken.current = null;
    await store.clear();
    setState({ status: 'signedOut', user: null });
  }, [store]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const choice = await choiceStore.get().catch(() => null);
      if (!cancelled) setSignupChoice(choice);
      const activeId = await quietly(() => activeStore.get(), null);
      if (!cancelled) setActiveInstitutionId(activeId);
      const role = await quietly(() => activeStore.getRole(), null);
      if (!cancelled) setActiveRole(role);
      const saved = await store.get().catch(() => null);
      if (!saved) {
        if (!cancelled) setState({ status: 'signedOut', user: null });
        return;
      }
      try {
        const session = await api.refresh(saved);
        if (!cancelled) await start(session);
      } catch (err) {
        // Expired, revoked or disabled: forget the token. Offline: also signed out for now,
        // until the local replica can open the app without the server (docs/07_sincronizacion.md).
        if (err instanceof ApiError && err.code !== 'NETWORK') await store.clear();
        if (!cancelled) setState({ status: 'signedOut', user: null });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api, store, choiceStore, activeStore, start]);

  /** Calls the API with the access token; when it expired (401), renews it once with the refresh token. */
  const withAccess = useCallback(
    async <T,>(call: (token: string) => Promise<T>): Promise<T> => {
      const token = accessToken.current;
      if (token) {
        try {
          return await call(token);
        } catch (err) {
          if (!(err instanceof ApiError) || err.status !== 401) throw err;
        }
      }
      const saved = await store.get();
      if (!saved) {
        await endSession();
        throw new ApiError(401, 'SESSION_EXPIRED', 'Tu sesión terminó. Inicia sesión de nuevo.');
      }
      try {
        await start(await api.refresh(saved));
      } catch (err) {
        if (err instanceof ApiError && err.code !== 'NETWORK') await endSession();
        throw err;
      }
      return call(accessToken.current as string);
    },
    [api, store, start, endSession],
  );

  const value = useMemo<SessionContextValue>(
    () => ({
      ...state,
      withAccess,
      applyUser,
      signupChoice,
      lastEmail,
      register: async (email, password, choice) => {
        await choiceStore.set(choice);
        setSignupChoice(choice);
        await start(await api.register({ email: email.trim(), password }));
      },
      verifyEmail: async (code) => start(await withAccess((token) => api.verifyEmail(token, code))),
      resendCode: async () => withAccess((token) => api.resendCode(token)),
      completeProfile: async (data) => start(await withAccess((token) => api.updateProfile(token, data))),
      signIn: async (email, password) => start(await api.login(email.trim(), password)),
      signOut: async (options) => {
        const email = options?.keepEmail ? (state.user?.email ?? null) : null;
        await endSession();
        await quietly(() => activeStore.clear(), undefined);
        setActiveInstitutionId(null);
        setActiveRole(null);
        setLastEmail(email);
      },
      activeInstitutionId,
      activeRole,
      setActiveInstitution: chooseActiveInstitution,
      completeOnboarding: async () => {
        const { user } = await withAccess((token) => onboardingApi.completeOnboarding(token));
        await applyUser(user);
      },
      previewSection: async (code) => (await withAccess((token) => onboardingApi.sectionByCode(token, code))).section,
      joinSection: async (code) => {
        const { result, user } = await withAccess((token) => onboardingApi.joinSection(token, code));
        await applyUser(user);
        return result;
      },
      previewInstitution: async (code, role) =>
        (await withAccess((token) => onboardingApi.institutionByCode(token, code, role))).institution,
      joinInstitution: async (code, role) => {
        const { result, user } = await withAccess((token) => onboardingApi.joinInstitution(token, code, role));
        await applyUser(user);
        return result;
      },
      registerInstitution: async (input) => {
        const { institution, user } = await withAccess((token) => onboardingApi.registerInstitution(token, input));
        await chooseActiveInstitution(institution.id);
        await applyUser(user);
        return institution;
      },
    }),
    [
      state,
      signupChoice,
      lastEmail,
      activeInstitutionId,
      activeRole,
      api,
      choiceStore,
      activeStore,
      onboardingApi,
      start,
      applyUser,
      chooseActiveInstitution,
      withAccess,
      endSession,
    ],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>');
  return ctx;
}
