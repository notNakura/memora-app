import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ApiError } from '../../../services/api/client';
import type { AcademicOverview, Section, Subject } from '../../../services/api/academic';
import { AcademicScreen } from '../AcademicScreen';
import type { AcademicClient } from '../academicClient';

jest.mock('expo-haptics', () => ({ selectionAsync: jest.fn(() => Promise.resolve()) }));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

const term = { termId: 3, name: '2026-II', startsOn: '2026-09-14', endsOn: '2027-01-29', status: 'open' as const };
const overview: AcademicOverview = {
  institutionName: 'UNERG',
  canManageTerms: true,
  areas: [
    { areaId: 1, name: 'Ingeniería de Sistemas' },
    { areaId: 2, name: 'Odontología' },
  ],
  terms: [term],
  pendingTeacherCount: 2,
};

const section = (over: Partial<Section>): Section => ({
  sectionId: 1,
  subjectId: 10,
  subjectCode: 'SI3',
  subjectName: 'Sistemas de Información III',
  termId: 3,
  termName: '2026-II',
  name: 'Sección 1',
  joinCode: 'SK3A26',
  joinMode: 'roster',
  capacity: 40,
  codeExpiresAt: null,
  isArchived: false,
  teacherId: 4,
  teacherName: 'María Hernández',
  studentCount: 32,
  ...over,
});
const sections = [
  section({}),
  section({ sectionId: 2, name: 'Sección 2', joinCode: 'SK3B26', teacherId: 5, teacherName: 'José Ramírez', studentCount: 28 }),
  section({
    sectionId: 3,
    subjectId: 11,
    subjectCode: 'Base de Datos',
    name: 'Sección 1',
    joinCode: 'BDA726',
    teacherId: null,
    teacherName: null,
    studentCount: 0,
  }),
];
const subjects: Subject[] = [
  { subjectId: 10, code: 'SI3', name: 'Sistemas de Información III', units: [{ unitId: 1, number: 1, name: 'Fundamentos' }] },
];

function fakeClient(over: Partial<AcademicClient> = {}): jest.Mocked<AcademicClient> {
  return {
    overview: jest.fn(async () => overview),
    sections: jest.fn(async () => sections),
    subjects: jest.fn(async () => subjects),
    teachers: jest.fn(async () => [{ userId: 4, name: 'María Hernández' }]),
    pendingTeachers: jest.fn(async () => [
      { membershipId: 21, userId: 8, name: 'Ana Pérez', email: 'ana@unerg.edu.ve', requestedAt: '2026-11-19T10:00:00' },
      { membershipId: 22, userId: 9, name: 'Luis Mora', email: 'luis@unerg.edu.ve', requestedAt: '2026-11-19T11:00:00' },
    ]),
    reviewTeacher: jest.fn(async () => undefined),
    createTerm: jest.fn(async (input) => ({ termId: 4, status: 'open' as const, ...input })),
    updateTerm: jest.fn(async (_id, patch) => ({ ...term, ...patch })),
    createSubject: jest.fn(async (_areaId, input) => ({ subjectId: 12, units: [], ...input })),
    updateSubject: jest.fn(async () => subjects[0]),
    deleteSubject: jest.fn(async () => undefined),
    createUnit: jest.fn(async (_s, input) => ({ unitId: 9, ...input })),
    deleteUnit: jest.fn(async () => undefined),
    createSection: jest.fn(async () => section({ sectionId: 9 })),
    updateSection: jest.fn(async (_id, patch) => section(patch)),
    renewSectionCode: jest.fn(async () => section({ joinCode: 'NEW234' })),
    ...over,
  } as jest.Mocked<AcademicClient>;
}

async function renderScreen(props: Partial<Parameters<typeof AcademicScreen>[0]> = {}) {
  const client = (props.client as jest.Mocked<AcademicClient>) ?? fakeClient();
  const onOpenUsers = jest.fn();
  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <AcademicScreen client={client} roleLabel="Administrador" onOpenUsers={onOpenUsers} {...props} />
    </SafeAreaProvider>,
  );
  await screen.findByText('SI3 · Sección 2');
  return { client, onOpenUsers };
}

describe('AcademicScreen (pantalla 35, CU-03, CU-28)', () => {
  it('shows the texts of the design for the institution admin', async () => {
    const { client } = await renderScreen();
    expect(screen.getByText('Administrador · UNERG')).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Gestión académica' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Área: Ingeniería de Sistemas' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Usuarios' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Materias' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Secciones' })).toBeTruthy();
    expect(screen.getByText('2 profesores por confirmar')).toBeTruthy();
    expect(screen.getByText('Se registraron con rol de profesor')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Revisar' })).toBeTruthy();
    expect(screen.getByText('Lapso 2026-II')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cerrar lapso' })).toBeTruthy();
    expect(screen.getByText('SI3 · Sección 1')).toBeTruthy();
    expect(screen.getByText('SK3A26')).toBeTruthy();
    expect(screen.getByText('Prof. María Hernández · 32 estudiantes')).toBeTruthy();
    expect(screen.getByText('Prof. José Ramírez · 28 estudiantes')).toBeTruthy();
    expect(screen.getByText('Base de Datos · Sección 1')).toBeTruthy();
    expect(screen.getByText('Sin profesor asignado')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Nueva sección' })).toBeTruthy();
    expect(client.sections).toHaveBeenCalledWith(1, 3);
  });

  it('gives the area admin no term or user options (RF-03)', async () => {
    const client = fakeClient({
      overview: jest.fn(async () => ({ ...overview, canManageTerms: false, areas: [overview.areas[0]] })),
    });
    await renderScreen({ client, roleLabel: 'Administrador de área', onOpenUsers: undefined });
    expect(screen.getByText('Administrador de área · UNERG')).toBeTruthy();
    expect(screen.queryByRole('tab', { name: 'Usuarios' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Cerrar lapso' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Nuevo lapso' })).toBeNull();
    expect(screen.getByText('Lapso 2026-II')).toBeTruthy();
    expect(screen.getByLabelText('Área: Ingeniería de Sistemas')).toBeTruthy();
  });

  it('opens Usuarios (36) from its tab', async () => {
    const { onOpenUsers } = await renderScreen();
    await fireEvent.press(screen.getByRole('tab', { name: 'Usuarios' }));
    expect(onOpenUsers).toHaveBeenCalled();
  });

  it('reloads the sections when another area is chosen', async () => {
    const { client } = await renderScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Área: Ingeniería de Sistemas' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Odontología' }));
    expect(client.sections).toHaveBeenLastCalledWith(2, 3);
  });

  it('confirms and rejects pending teachers', async () => {
    const { client } = await renderScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Revisar' }));
    expect(await screen.findByText('Ana Pérez')).toBeTruthy();
    expect(screen.getByText('ana@unerg.edu.ve')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Confirmar a Ana Pérez' }));
    expect(client.reviewTeacher).toHaveBeenCalledWith(21, 'approve');
    expect(await screen.findByText('1 profesor por confirmar')).toBeTruthy();
    expect(screen.queryByText('Ana Pérez')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Rechazar a Luis Mora' }));
    expect(client.reviewTeacher).toHaveBeenCalledWith(22, 'reject');
    expect(await screen.findByText('No hay profesores por confirmar.')).toBeTruthy();
  });

  it('closes the term after confirming', async () => {
    const { client } = await renderScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Cerrar lapso' }));
    expect(client.updateTerm).not.toHaveBeenCalled();
    expect(
      screen.getByText('Al cerrar el lapso no se pueden abrir secciones nuevas en él. Podrás reabrirlo después.'),
    ).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Sí, cerrar lapso' }));
    expect(client.updateTerm).toHaveBeenCalledWith(3, { status: 'closed' });
    expect(await screen.findByRole('button', { name: 'Reabrir lapso' })).toBeTruthy();
  });

  it('creates a section with subject, teacher and mode', async () => {
    const { client } = await renderScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Nueva sección' }));
    const sheet = await screen.findByLabelText('Formulario de sección');
    await fireEvent.press(within(sheet).getByRole('button', { name: 'Materia: SI3 · Sistemas de Información III' }));
    await fireEvent.changeText(within(sheet).getByLabelText('Nombre de la sección'), ' Sección 3 ');
    await fireEvent.press(within(sheet).getByRole('button', { name: 'Profesor: Sin profesor asignado' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'María Hernández' }));
    await fireEvent.press(screen.getByRole('radio', { name: /^Con aprobación/ }));
    await fireEvent.changeText(screen.getByLabelText('Cupo (opcional)'), '35');
    await fireEvent.changeText(screen.getByLabelText('El código vence (opcional)'), '2026-12-15');
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar sección' }));
    expect(client.createSection).toHaveBeenCalledWith(10, {
      termId: 3,
      name: 'Sección 3',
      teacherId: 4,
      joinMode: 'approval',
      capacity: 35,
      codeExpiresAt: '2026-12-15',
    });
  });

  it('shows the field errors from the server in the section form', async () => {
    const client = fakeClient({
      createSection: jest.fn(async () => {
        throw new ApiError(400, 'VALIDATION', 'Revisa los datos marcados.', {
          teacherId: 'Elige un profesor activo de la institución.',
        });
      }),
    });
    await renderScreen({ client });
    await fireEvent.press(screen.getByRole('button', { name: 'Nueva sección' }));
    await fireEvent.changeText(screen.getByLabelText('Nombre de la sección'), 'Sección 3');
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar sección' }));
    expect(await screen.findByText('Elige un profesor activo de la institución.')).toBeTruthy();
    expect(screen.getByText('Revisa los datos marcados.')).toBeTruthy();
  });

  it('renews the code and archives a section from its sheet', async () => {
    const { client } = await renderScreen();
    await fireEvent.press(screen.getByRole('button', { name: /^SI3 · Sección 1/ }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Generar código nuevo' }));
    expect(client.renewSectionCode).toHaveBeenCalledWith(1);
    expect(await screen.findAllByText('NEW234')).toHaveLength(2);
    await fireEvent.press(screen.getByRole('button', { name: 'Archivar sección' }));
    expect(client.updateSection).toHaveBeenCalledWith(1, { isArchived: true });
  });

  it('lists subjects with their units and creates a subject', async () => {
    const { client } = await renderScreen();
    await fireEvent.press(screen.getByRole('tab', { name: 'Materias' }));
    expect(await screen.findByText('SI3 · Sistemas de Información III')).toBeTruthy();
    expect(screen.getByText('Unidad 1 · Fundamentos')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Nueva materia' }));
    await fireEvent.changeText(screen.getByLabelText('Código'), 'BD1');
    await fireEvent.changeText(screen.getByLabelText('Nombre de la materia'), 'Base de Datos');
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar materia' }));
    expect(client.createSubject).toHaveBeenCalledWith(1, { code: 'BD1', name: 'Base de Datos' });
    expect(await screen.findByText('BD1 · Base de Datos')).toBeTruthy();
  });

  it('shows the error and retries when the data does not load', async () => {
    const overviewMock = jest
      .fn<Promise<AcademicOverview>, []>()
      .mockRejectedValueOnce(new ApiError(0, 'NETWORK', 'No pudimos conectar con Memora.'))
      .mockResolvedValue(overview);
    const client = fakeClient({ overview: overviewMock });
    await render(
      <SafeAreaProvider initialMetrics={metrics}>
        <AcademicScreen client={client} roleLabel="Administrador" />
      </SafeAreaProvider>,
    );
    expect(await screen.findByText('No pudimos conectar con Memora.')).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
    });
    expect(await screen.findByText('SI3 · Sección 2')).toBeTruthy();
  });
});
