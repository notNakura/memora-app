import { act, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { ApiError, type AuthApi, type MembershipRole, type Session, type User } from '../../../services/api/client';
import type { ActiveInstitutionStore } from '../../../services/activeInstitutionStore';
import type { OnboardingApi } from '../../../services/api/onboarding';
import type { SignupChoice, SignupChoiceStore } from '../../../services/signupChoiceStore';
import type { TokenStore } from '../../../services/tokenStore';
import { SessionProvider, useSession } from '../session';

jest.mock('expo-secure-store', () => ({}));

const verifiedUser: User = {
  id: 7,
  email: 'ana@unerg.edu.ve',
  emailVerified: true,
  profileComplete: true,
  nationalId: 'V-27123456',
  firstNames: 'Ana',
  lastNames: 'Torres',
  birthDate: null,
  sex: null,
  onboardingCompleted: false,
  memberships: [],
};
const newUser: User = {
  ...verifiedUser,
  emailVerified: false,
  profileComplete: false,
  nationalId: null,
  firstNames: null,
  lastNames: null,
};
const session = (refreshToken: string, user: User = verifiedUser, accessToken = 'access'): Session => ({
  user,
  accessToken,
  refreshToken,
});

function memoryStore(initial: string | null = null): TokenStore & { value: string | null } {
  const store = {
    value: initial,
    get: async () => store.value,
    set: async (t: string) => {
      store.value = t;
    },
    clear: async () => {
      store.value = null;
    },
  };
  return store;
}

function memoryChoice(initial: SignupChoice | null = null): SignupChoiceStore & { value: SignupChoice | null } {
  const store = {
    value: initial,
    get: async () => store.value,
    set: async (c: SignupChoice) => {
      store.value = c;
    },
    clear: async () => {
      store.value = null;
    },
  };
  return store;
}

function fakeApi(overrides: Partial<AuthApi> = {}): AuthApi {
  return {
    login: jest.fn(async () => session('refresh-login')),
    register: jest.fn(async () => session('refresh-register', newUser, 'access-register')),
    verifyEmail: jest.fn(async () => session('refresh-verified', { ...newUser, emailVerified: true }, 'access-verified')),
    resendCode: jest.fn(async () => undefined),
    updateProfile: jest.fn(async () => session('refresh-profile', verifiedUser, 'access-profile')),
    refresh: jest.fn(async () => session('refresh-rotated')),
    me: jest.fn(async () => ({ user: verifiedUser })),
    ...overrides,
  };
}

let ctx: ReturnType<typeof useSession>;
function Probe() {
  ctx = useSession();
  const who = ctx.status === 'signedIn' ? `in:${ctx.user?.email}:${ctx.user?.emailVerified ? 'v' : 'nv'}` : ctx.status;
  return <Text>{who}</Text>;
}

const mount = (api: AuthApi, store: TokenStore, choices: SignupChoiceStore = memoryChoice()) =>
  render(
    <SessionProvider api={api} store={store} choiceStore={choices}>
      <Probe />
    </SessionProvider>,
  );

describe('SessionProvider', () => {
  it('starts signed out when no token is saved', async () => {
    await mount(fakeApi(), memoryStore());
    expect(await screen.findByText('signedOut')).toBeTruthy();
  });

  it('restores the session from the saved refresh token and stores the new one', async () => {
    const store = memoryStore('refresh-1');
    const api = fakeApi();
    await mount(api, store, memoryChoice('teacher'));
    expect(await screen.findByText('in:ana@unerg.edu.ve:v')).toBeTruthy();
    expect(api.refresh).toHaveBeenCalledWith('refresh-1');
    expect(store.value).toBe('refresh-rotated');
    expect(ctx.signupChoice).toBe('teacher');
  });

  it('applyUser replaces the signed-in user with the one a route returned (profile, preferences)', async () => {
    await mount(fakeApi(), memoryStore('refresh-1'));
    expect(await screen.findByText('in:ana@unerg.edu.ve:v')).toBeTruthy();
    const current = ctx.status === 'signedIn' ? ctx.user! : null;
    await act(() => ctx.applyUser({ ...current!, email: 'ana.nueva@unerg.edu.ve' }));
    expect(await screen.findByText('in:ana.nueva@unerg.edu.ve:v')).toBeTruthy();
  });

  it('forgets a token the server rejects (expired or account disabled)', async () => {
    const store = memoryStore('refresh-1');
    await mount(fakeApi({ refresh: jest.fn(() => Promise.reject(new ApiError(403, 'ACCOUNT_DISABLED', 'x'))) }), store);
    expect(await screen.findByText('signedOut')).toBeTruthy();
    expect(store.value).toBeNull();
  });

  it('keeps the token when the phone is offline', async () => {
    const store = memoryStore('refresh-1');
    await mount(fakeApi({ refresh: jest.fn(() => Promise.reject(new ApiError(0, 'NETWORK', 'x'))) }), store);
    expect(await screen.findByText('signedOut')).toBeTruthy();
    expect(store.value).toBe('refresh-1');
  });

  it('register saves the choice on the phone, sends only email and password and starts an unverified session', async () => {
    const store = memoryStore();
    const choices = memoryChoice();
    const api = fakeApi();
    await mount(api, store, choices);
    await screen.findByText('signedOut');

    await act(() => ctx.register(' ana@unerg.edu.ve ', 'clave-segura', 'teacher'));

    expect(api.register).toHaveBeenCalledWith({ email: 'ana@unerg.edu.ve', password: 'clave-segura' });
    expect(choices.value).toBe('teacher');
    expect(ctx.signupChoice).toBe('teacher');
    expect(store.value).toBe('refresh-register');
    expect(screen.getByText('in:ana@unerg.edu.ve:nv')).toBeTruthy();
  });

  it('verifyEmail, resendCode and completeProfile use the access token in memory and keep the newest refresh token', async () => {
    const store = memoryStore();
    const api = fakeApi();
    await mount(api, store);
    await screen.findByText('signedOut');
    await act(() => ctx.register('ana@unerg.edu.ve', 'clave-segura', 'student'));

    await act(() => ctx.resendCode());
    expect(api.resendCode).toHaveBeenCalledWith('access-register');

    await act(() => ctx.verifyEmail('482015'));
    expect(api.verifyEmail).toHaveBeenCalledWith('access-register', '482015');
    expect(store.value).toBe('refresh-verified');
    expect(screen.getByText('in:ana@unerg.edu.ve:v')).toBeTruthy();

    const profile = { nationalId: 'V-27123456', firstNames: 'Ana', lastNames: 'Torres', birthDate: null, sex: null };
    await act(() => ctx.completeProfile(profile));
    expect(api.updateProfile).toHaveBeenCalledWith('access-verified', profile);
    expect(store.value).toBe('refresh-profile');
    expect(ctx.user?.profileComplete).toBe(true);
  });

  it('renews an expired access token once and retries', async () => {
    const store = memoryStore('refresh-1');
    const verifyEmail = jest
      .fn()
      .mockRejectedValueOnce(new ApiError(401, 'SESSION_EXPIRED', 'x'))
      .mockResolvedValueOnce(session('refresh-verified'));
    const api = fakeApi({ refresh: jest.fn(async () => session('refresh-2', newUser, 'access-2')), verifyEmail });
    await mount(api, store);
    await screen.findByText('in:ana@unerg.edu.ve:nv');

    await act(() => ctx.verifyEmail('482015'));

    expect(verifyEmail).toHaveBeenNthCalledWith(2, 'access-2', '482015');
    expect(store.value).toBe('refresh-verified');
  });

  it('clears the stored choice once the user has an active membership', async () => {
    const choices = memoryChoice('student');
    const member = {
      ...verifiedUser,
      memberships: [{ institutionId: 1, institutionName: 'UNERG', role: 'student' as const, status: 'active' as const, areaId: null }],
    };
    await mount(fakeApi({ refresh: jest.fn(async () => session('refresh-2', member)) }), memoryStore('refresh-1'), choices);
    await screen.findByText('in:ana@unerg.edu.ve:v');
    expect(choices.value).toBeNull();
    expect(ctx.signupChoice).toBeNull();
  });

  it('signIn starts a session; signOut deletes the token from the device', async () => {
    const store = memoryStore();
    const api = fakeApi();
    await mount(api, store);
    await screen.findByText('signedOut');

    await act(() => ctx.signIn(' ana@unerg.edu.ve ', 'clave-segura'));
    expect(api.login).toHaveBeenCalledWith('ana@unerg.edu.ve', 'clave-segura');
    expect(store.value).toBe('refresh-login');

    await act(() => ctx.signOut());
    expect(screen.getByText('signedOut')).toBeTruthy();
    expect(store.value).toBeNull();
    expect(ctx.lastEmail).toBeNull();
  });

  it('signOut keeping the email remembers it for step 1 (Cambiar correo)', async () => {
    const store = memoryStore();
    await mount(fakeApi(), store);
    await screen.findByText('signedOut');
    await act(() => ctx.register('ana@unerg.edu.ve', 'clave-segura', 'student'));

    await act(() => ctx.signOut({ keepEmail: true }));

    expect(screen.getByText('signedOut')).toBeTruthy();
    expect(store.value).toBeNull();
    expect(ctx.lastEmail).toBe('ana@unerg.edu.ve');
  });
});

// Every onboarding route refreshes the stored user from the response's `user`.
describe('SessionProvider · onboarding and joining', () => {
  const adminMembership = {
    institutionId: 3,
    institutionName: 'UNERG',
    role: 'institution_admin' as const,
    status: 'active' as const,
    areaId: null,
  };
  const section = {
    code: 'SK3A26',
    institutionName: 'UNERG',
    areaName: 'Ingeniería de Sistemas',
    subjectName: 'Sistemas de Información III',
    sectionName: 'Sección 1',
    termName: '2026-II',
    teacherName: 'María Hernández',
    deckCount: 2,
    assessmentCount: 1,
    outcome: 'active' as const,
  };

  function fakeOnboarding(overrides: Partial<OnboardingApi> = {}): OnboardingApi {
    return {
      completeOnboarding: jest.fn(async () => ({ user: { ...verifiedUser, onboardingCompleted: true } })),
      sectionByCode: jest.fn(async () => ({ section })),
      joinSection: jest.fn(async () => ({ result: 'pending' as const, user: { ...verifiedUser, firstNames: 'Pendiente' } })),
      institutionByCode: jest.fn(async () => ({
        institution: { code: 'K7M2P9QA', name: 'UNERG', type: 'university' as const, outcome: 'pending' as const },
      })),
      joinInstitution: jest.fn(async () => ({ result: 'active' as const, user: { ...verifiedUser, memberships: [adminMembership] } })),
      registerInstitution: jest.fn(async () => ({
        institution: { id: 3, name: 'UNERG', type: 'university' as const, joinCode: 'K7M2P9QA' },
        user: { ...verifiedUser, memberships: [adminMembership] },
      })),
      ...overrides,
    };
  }

  function memoryActive(
    initial: number | null = null,
    initialRole: MembershipRole | null = null,
  ): ActiveInstitutionStore & { value: number | null; role: MembershipRole | null } {
    const store = {
      value: initial,
      role: initialRole,
      get: async () => store.value,
      getRole: async () => store.role,
      set: async (id: number, role?: MembershipRole | null) => {
        store.value = id;
        store.role = role ?? null;
      },
      clear: async () => {
        store.value = null;
        store.role = null;
      },
    };
    return store;
  }

  const mountWith = (onboarding: OnboardingApi, choices = memoryChoice(), active = memoryActive()) =>
    render(
      <SessionProvider
        api={fakeApi()}
        store={memoryStore('refresh-1')}
        choiceStore={choices}
        onboardingApi={onboarding}
        activeStore={active}
      >
        <Probe />
      </SessionProvider>,
    );

  it('completeOnboarding sends PATCH /me with the access token and keeps the returned user', async () => {
    const onboarding = fakeOnboarding();
    await mountWith(onboarding);
    await screen.findByText('in:ana@unerg.edu.ve:v');

    await act(() => ctx.completeOnboarding());

    expect(onboarding.completeOnboarding).toHaveBeenCalledWith('access');
    expect(ctx.user?.onboardingCompleted).toBe(true);
  });

  it('previewSection returns the preview; joinSection returns the result and refreshes the user', async () => {
    const onboarding = fakeOnboarding();
    await mountWith(onboarding);
    await screen.findByText('in:ana@unerg.edu.ve:v');

    let preview: unknown;
    await act(async () => {
      preview = await ctx.previewSection('SK3A26');
    });
    expect(preview).toEqual(section);
    expect(onboarding.sectionByCode).toHaveBeenCalledWith('access', 'SK3A26');

    let result: unknown;
    await act(async () => {
      result = await ctx.joinSection('SK3A26');
    });
    expect(result).toBe('pending');
    expect(onboarding.joinSection).toHaveBeenCalledWith('access', 'SK3A26');
    expect(ctx.user?.firstNames).toBe('Pendiente');
  });

  it('joinInstitution sends the role; an active membership clears the stored signup choice', async () => {
    const onboarding = fakeOnboarding();
    const choices = memoryChoice('teacher');
    await mountWith(onboarding, choices);
    await screen.findByText('in:ana@unerg.edu.ve:v');

    let result: unknown;
    await act(async () => {
      result = await ctx.joinInstitution('K7M2P9QA', 'teacher');
    });

    expect(result).toBe('active');
    expect(onboarding.joinInstitution).toHaveBeenCalledWith('access', 'K7M2P9QA', 'teacher');
    expect(ctx.user?.memberships).toEqual([adminMembership]);
    expect(choices.value).toBeNull();
    expect(ctx.signupChoice).toBeNull();
  });

  it('registerInstitution posts the input, refreshes the user and makes the new institution active', async () => {
    const onboarding = fakeOnboarding();
    const active = memoryActive();
    await mountWith(onboarding, memoryChoice('institution'), active);
    await screen.findByText('in:ana@unerg.edu.ve:v');

    await act(async () => {
      await ctx.registerInstitution({ name: 'UNERG', type: 'university', confirmDuplicate: true });
    });

    expect(onboarding.registerInstitution).toHaveBeenCalledWith('access', {
      name: 'UNERG',
      type: 'university',
      confirmDuplicate: true,
    });
    expect(ctx.user?.memberships).toEqual([adminMembership]);
    expect(active.value).toBe(3);
    expect(ctx.activeInstitutionId).toBe(3);
  });

  it('loads the stored active institution and saves a new choice on the phone', async () => {
    const active = memoryActive(5);
    await mountWith(fakeOnboarding(), memoryChoice(), active);
    await screen.findByText('in:ana@unerg.edu.ve:v');
    expect(ctx.activeInstitutionId).toBe(5);

    await act(() => ctx.setActiveInstitution(3));

    expect(active.value).toBe(3);
    expect(ctx.activeInstitutionId).toBe(3);
  });

  it('loads the stored active role and saves a role chosen with the institution', async () => {
    const active = memoryActive(5, 'teacher');
    await mountWith(fakeOnboarding(), memoryChoice(), active);
    await screen.findByText('in:ana@unerg.edu.ve:v');
    expect(ctx.activeRole).toBe('teacher');

    await act(() => ctx.setActiveInstitution(3, 'institution_admin'));
    expect(active.value).toBe(3);
    expect(active.role).toBe('institution_admin');
    expect(ctx.activeInstitutionId).toBe(3);
    expect(ctx.activeRole).toBe('institution_admin');

    await act(() => ctx.setActiveInstitution(4));
    expect(active.role).toBeNull();
    expect(ctx.activeRole).toBeNull();
  });

  it('signing out forgets the active institution and role', async () => {
    const active = memoryActive(5, 'teacher');
    await mountWith(fakeOnboarding(), memoryChoice(), active);
    await screen.findByText('in:ana@unerg.edu.ve:v');

    await act(() => ctx.signOut());

    expect(active.value).toBeNull();
    expect(active.role).toBeNull();
    expect(ctx.activeInstitutionId).toBeNull();
    expect(ctx.activeRole).toBeNull();
  });

  it('passes server errors through unchanged', async () => {
    const err = new ApiError(404, 'JOIN_CODE_NOT_FOUND', 'No encontramos ese código. Revísalo e intenta de nuevo.');
    await mountWith(fakeOnboarding({ joinSection: jest.fn(() => Promise.reject(err)) }));
    await screen.findByText('in:ana@unerg.edu.ve:v');

    await expect(act(() => ctx.joinSection('ZZZZZZ'))).rejects.toBe(err);
    expect(ctx.user?.email).toBe('ana@unerg.edu.ve');
  });
});
