import { AcademicRoute } from '../../../features/academic/AcademicRoute';

/** Gestión académica (35) for the area admin: only its area, no term or user options (RF-03). */
export default function AreaAdminIndexTab() {
  return <AcademicRoute role="area_admin" />;
}
