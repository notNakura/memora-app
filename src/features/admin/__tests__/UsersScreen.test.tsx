import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { JoinRequest, Member, RosterResult } from '../../../services/api/admin';
import { UsersScreen } from '../UsersScreen';

jest.mock('expo-haptics', () => ({ selectionAsync: jest.fn(() => Promise.resolve()) }));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const NOW = new Date('2026-11-20T10:00:00');

const member = (m: Partial<Member>): Member => ({
  membershipId: 1,
  userId: 1,
  name: 'X',
  email: 'x@gmail.com',
  nationalId: 'V-1',
  role: 'student',
  status: 'active',
  areaId: null,
  areaName: null,
  emailEditable: false,
  ...m,
});

const members: Member[] = [
  member({ membershipId: 31, userId: 3, name: 'María Hernández', role: 'teacher' }),
  member({ membershipId: 32, userId: 4, name: 'Luis Pérez', emailEditable: true, status: 'invited', email: 'luis.viejo@gmail.com' }),
  member({ membershipId: 33, userId: 6, name: 'Tomás Vera', status: 'removed' }),
];

const requests: JoinRequest[] = [
  { membershipId: 41, userId: 7, name: 'José Ramírez', email: 'jose@gmail.com', role: 'teacher', areaId: null, requestedAt: '2026-11-20T08:00:00', inRoster: false },
  { membershipId: 42, userId: 8, name: 'Carla Rojas', email: 'carla@gmail.com', role: 'teacher', areaId: null, requestedAt: '2026-11-20T08:05:00', inRoster: true },
];

const preview: RosterResult = {
  fileName: null,
  totalRows: 2,
  created: 1,
  loaded: 1,
  errorCount: 1,
  rows: [
    { line: 2, nationalId: 'V-30555777', firstNames: 'Daniela', lastNames: 'Suárez', email: 'd@gmail.com', role: 'student', section: null, outcome: 'created', error: null },
    { line: 3, nationalId: 'V-20000001', firstNames: 'Luis', lastNames: 'Pérez', email: 'l@gmail.com', role: 'student', section: null, outcome: null, error: 'la cédula ya está registrada con otro correo' },
  ],
};

function makeService() {
  return {
    members: jest.fn(async () => ({ members })),
    requests: jest.fn(async () => ({ requests })),
    decide: jest.fn(async (ids: number[]) => ({ updated: ids.length })),
    changeRole: jest.fn(async () => ({ member: members[0] })),
    removeMember: jest.fn(async () => ({ member: members[0] })),
    reinstateMember: jest.fn(async () => ({ member: members[2] })),
    correctEmail: jest.fn(async (userId: number, email: string) => ({ user: { userId, email } })),
    previewRoster: jest.fn(async () => ({ roster: preview })),
    importRoster: jest.fn(async () => ({ roster: { ...preview, fileName: 'inscritos_SI3_2026-II.csv', rows: [preview.rows[1]] } })),
    lastImport: jest.fn(async () => ({
      lastImport: {
        occurredAt: '2026-11-20T09:00:00',
        actorName: 'Pedro Gómez',
        fileName: 'inscritos_SI3_2026-II.csv',
        totalRows: 32,
        created: 30,
        loaded: 30,
        errors: [
          { line: 4, nationalId: 'V-1', message: 'cédula repetida en el archivo' },
          { line: 9, nationalId: 'V-2', message: 'cédula repetida en el archivo' },
        ],
      },
    })),
  };
}

async function renderScreen(service = makeService(), canManageMembers = true) {
  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <UsersScreen institutionName="UNERG" service={service} canManageMembers={canManageMembers} now={() => NOW} />
    </SafeAreaProvider>,
  );
  await screen.findByText('José Ramírez');
  return service;
}

describe('UsersScreen (pantalla 36, CU-02, CU-37, RF-02, RF-48, RF-50, RF-64)', () => {
  it('shows the texts of design 36', async () => {
    await renderScreen();
    expect(screen.getByText('Administrador · UNERG')).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Usuarios' })).toBeTruthy();
    expect(screen.getByLabelText('Buscar usuario')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Importar CSV' })).toBeTruthy();
    expect(await screen.findByText('Última importación · hace 1 hora')).toBeTruthy();
    expect(screen.getByText('inscritos_SI3_2026-II.csv: 30 usuarios creados, 2 filas con error.')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Ver filas con error' })).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Por confirmar (2)' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Revisar en bloque' })).toBeTruthy();
    expect(screen.getByText('Se registró como profesor · No está en la lista')).toBeTruthy();
    expect(screen.getByText('Se registró como profesor · En la lista')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Confirmar a José Ramírez' })).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Todos' })).toBeTruthy();
    expect(screen.getByText('Profesor · activo')).toBeTruthy();
    expect(screen.getByText('Estudiante · retirado de la institución')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Opciones de María Hernández' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reincorporar a Tomás Vera' })).toBeTruthy();
  });

  it('confirms or rejects one request and reloads', async () => {
    const service = await renderScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Confirmar a José Ramírez' }));
    await waitFor(() => expect(service.decide).toHaveBeenCalledWith([41], 'approve'));
    await fireEvent.press(screen.getByRole('button', { name: 'Rechazar a Carla Rojas' }));
    await waitFor(() => expect(service.decide).toHaveBeenCalledWith([42], 'reject'));
    await waitFor(() => expect(service.requests).toHaveBeenCalledTimes(3));
  });

  it('reviews in bulk: approve the ones on the list, reject the others (CU-37 7a)', async () => {
    const service = await renderScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Revisar en bloque' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Aprobar los de la lista' }));
    await waitFor(() => expect(service.decide).toHaveBeenCalledWith([42], 'approve'));
    await fireEvent.press(screen.getByRole('button', { name: 'Rechazar los demás' }));
    await waitFor(() => expect(service.decide).toHaveBeenCalledWith([41], 'reject'));
  });

  it('searches members', async () => {
    const service = await renderScreen();
    await fireEvent.changeText(screen.getByLabelText('Buscar usuario'), 'hernández');
    await fireEvent(screen.getByLabelText('Buscar usuario'), 'submitEditing');
    await waitFor(() => expect(service.members).toHaveBeenLastCalledWith({ q: 'hernández', role: undefined, status: undefined }));
  });

  it('member options: change role, reset password (disponible pronto), remove, reinstate', async () => {
    const service = await renderScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Opciones de María Hernández' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Cambiar a estudiante' }));
    await waitFor(() => expect(service.changeRole).toHaveBeenCalledWith(31, 'student'));
    await fireEvent.press(screen.getByRole('button', { name: 'Opciones de María Hernández' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Restablecer contraseña' }));
    expect(screen.getByText('Restablecer contraseña estará disponible pronto.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Retirar de la institución' }));
    await waitFor(() => expect(service.removeMember).toHaveBeenCalledWith(31));
    await fireEvent.press(screen.getByRole('button', { name: 'Reincorporar a Tomás Vera' }));
    await waitFor(() => expect(service.reinstateMember).toHaveBeenCalledWith(33));
  });

  it('corrects the email of a roster person (decision 8a)', async () => {
    const service = await renderScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Opciones de Luis Pérez' }));
    await fireEvent.changeText(screen.getByLabelText('Correo de la lista de inscritos'), 'luis.perez@gmail.com');
    await fireEvent.press(screen.getByRole('button', { name: 'Corregir correo' }));
    await waitFor(() => expect(service.correctEmail).toHaveBeenCalledWith(4, 'luis.perez@gmail.com'));
  });

  it('imports the roster CSV: preview with row errors, then import', async () => {
    const service = await renderScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Importar CSV' }));
    await fireEvent.changeText(screen.getByLabelText('Contenido del archivo CSV'), 'cedula;nombres;apellidos;correo\n...');
    await fireEvent.changeText(screen.getByLabelText('Nombre del archivo'), 'inscritos_SI3_2026-II.csv');
    await fireEvent.press(screen.getByRole('button', { name: 'Vista previa' }));
    await waitFor(() => expect(service.previewRoster).toHaveBeenCalledWith('cedula;nombres;apellidos;correo\n...'));
    expect(await screen.findByText('1 fila válida, 1 con error.')).toBeTruthy();
    expect(screen.getByText('Fila 3 (V-20000001): la cédula ya está registrada con otro correo')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Importar 1 fila válida' }));
    await waitFor(() =>
      expect(service.importRoster).toHaveBeenCalledWith('cedula;nombres;apellidos;correo\n...', 'inscritos_SI3_2026-II.csv'),
    );
  });

  it('an area admin only sees the requests', async () => {
    const service = await renderScreen(makeService(), false);
    expect(service.members).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Importar CSV' })).toBeNull();
    expect(screen.queryByRole('header', { name: 'Todos' })).toBeNull();
  });
});
