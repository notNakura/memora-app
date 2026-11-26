// Admin screens (34, 36, 37) connected to the session: the active institution where the person is an
// active admin, and the admin API bound to it with the session's withAccess.
import { useMemo } from 'react';
import type { User } from '../../services/api/client';
import { useSession } from '../auth/session';
import { ShellPlaceholder } from '../shell/ShellPlaceholder';
import { bindAdminService } from './adminService';
import { AreasScreen } from './AreasScreen';
import { ModerationScreen } from './ModerationScreen';
import { UsersScreen } from './UsersScreen';

type AdminContext = { institutionId: number; institutionName: string; institutionAdmin: boolean };

/** The active institution when the person administers it; otherwise the first one they administer. */
export function adminInstitution(user: User, activeInstitutionId: number | null): AdminContext | null {
  const admin = user.memberships.filter(
    (m) => m.status === 'active' && (m.role === 'institution_admin' || m.role === 'area_admin'),
  );
  const pick =
    admin.find((m) => m.institutionId === activeInstitutionId && m.role === 'institution_admin') ??
    admin.find((m) => m.institutionId === activeInstitutionId) ??
    admin.find((m) => m.role === 'institution_admin') ??
    admin[0];
  if (!pick) return null;
  return {
    institutionId: pick.institutionId,
    institutionName: pick.institutionName,
    institutionAdmin: admin.some((m) => m.institutionId === pick.institutionId && m.role === 'institution_admin'),
  };
}

function useAdmin() {
  const { user, activeInstitutionId, withAccess } = useSession();
  const context = user ? adminInstitution(user, activeInstitutionId) : null;
  const institutionId = context?.institutionId ?? null;
  const service = useMemo(
    () => (institutionId === null ? null : bindAdminService(withAccess, institutionId)),
    [withAccess, institutionId],
  );
  return { context, service };
}

const NotAdmin = ({ title, screen }: { title: string; screen: number }) => (
  <ShellPlaceholder title={title} screens={[screen]} />
);

/** Áreas y administradores (34). */
export function AreasRoute() {
  const { context, service } = useAdmin();
  if (!context || !service || !context.institutionAdmin) return <NotAdmin title="Áreas y administradores" screen={34} />;
  return <AreasScreen institutionName={context.institutionName} service={service} />;
}

/** Usuarios (36); an area admin only sees the requests of its areas. */
export function UsersRoute() {
  const { context, service } = useAdmin();
  if (!context || !service) return <NotAdmin title="Usuarios" screen={36} />;
  return (
    <UsersScreen institutionName={context.institutionName} service={service} canManageMembers={context.institutionAdmin} />
  );
}

/** Moderación y bitácora (37). */
export function ModerationRoute() {
  const { context, service } = useAdmin();
  if (!context || !service || !context.institutionAdmin) return <NotAdmin title="Moderación y bitácora" screen={37} />;
  return <ModerationScreen institutionName={context.institutionName} service={service} />;
}
