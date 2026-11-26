import { AcademicRoute } from '../../../features/academic/AcademicRoute';

/** Gestión académica (35) for the institution admin: every area, terms and Usuarios. */
export default function AdminAcademicTab() {
  return <AcademicRoute role="institution_admin" />;
}
