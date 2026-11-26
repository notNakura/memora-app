// Which screen opens first (docs/08_navegacion.md, "Arranque"). Pure so every row can be tested.
import type { MembershipRole, User } from '../../services/api/client';
import type { SignupChoice } from '../../services/signupChoiceStore';

export type StartRoute =
  | { name: 'access'; screen: 1 }
  | { name: 'verifyEmail'; screen: 2 }
  | { name: 'completeProfile'; screen: 3 }
  | { name: 'joinSection'; screen: 5 }
  | { name: 'studentHome'; screen: 6 }
  | { name: 'myInstitutions'; screen: 22 }
  | { name: 'teacherDashboard'; screen: 24 }
  | { name: 'institutionAdmin'; screen: 34 }
  | { name: 'academicManagement'; screen: 35 };

/** Widest scope first: a person with several roles starts in the one with the widest scope. */
const ROLE_ROUTES: [MembershipRole, StartRoute][] = [
  ['institution_admin', { name: 'institutionAdmin', screen: 34 }],
  ['area_admin', { name: 'academicManagement', screen: 35 }],
  ['teacher', { name: 'teacherDashboard', screen: 24 }],
  ['student', { name: 'studentHome', screen: 6 }],
];

export function hasActiveMembership(user: User): boolean {
  return user.memberships.some((m) => m.status === 'active');
}

/**
 * Screen for the user once the guide is done. With several institutions, the active one stored on the phone
 * (screen 22) decides the role; without it, or when it has no active membership, the widest role wins.
 * The role stored with the active institution (screen 22) wins when the person
 * still holds it actively there.
 */
export function startRoute(
  user: User | null,
  storedChoice: SignupChoice | null,
  activeInstitutionId: number | null = null,
  activeRole: MembershipRole | null = null,
): StartRoute {
  if (!user) return { name: 'access', screen: 1 };
  if (!user.emailVerified) return { name: 'verifyEmail', screen: 2 };
  if (!user.profileComplete) return { name: 'completeProfile', screen: 3 };

  const active = user.memberships.filter((m) => m.status === 'active');
  const inActiveInstitution = active.filter((m) => m.institutionId === activeInstitutionId);
  const activeRoles = new Set((inActiveInstitution.length > 0 ? inActiveInstitution : active).map((m) => m.role));
  const chosen = inActiveInstitution.some((m) => m.role === activeRole) ? activeRole : null;
  const byRole = ROLE_ROUTES.find(([role]) => (chosen ? role === chosen : activeRoles.has(role)));
  if (byRole) return byRole[1];

  return storedChoice === 'teacher' ? { name: 'myInstitutions', screen: 22 } : { name: 'joinSection', screen: 5 };
}

/** Every first screen, including the guide (4) and Registrar mi institución (33). */
export type AppStartRoute = StartRoute | { name: 'guide'; screen: 4 } | { name: 'registerInstitution'; screen: 33 };

/**
 * startRoute plus the onboarding rows: the guide opens once the personal data is complete and before any
 * other screen; a person who chose to register an institution in step 1 then goes to 33 until they
 * have an active membership.
 */
export function appStartRoute(
  user: User | null,
  storedChoice: SignupChoice | null,
  activeInstitutionId: number | null = null,
  activeRole: MembershipRole | null = null,
): AppStartRoute {
  const route = startRoute(user, storedChoice, activeInstitutionId, activeRole);
  if (!user || route.screen <= 3) return route;
  if (!user.onboardingCompleted) return { name: 'guide', screen: 4 };
  if (storedChoice === 'institution' && !hasActiveMembership(user)) return { name: 'registerInstitution', screen: 33 };
  return route;
}
