import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ApiError } from '../../../services/api/client';
import type { Overview } from '../../../services/api/admin';
import { AreasScreen } from '../AreasScreen';

jest.mock('expo-haptics', () => ({ selectionAsync: jest.fn(() => Promise.resolve()) }));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

const overview: Overview = {
  join: { code: 'UNERGK26', joinMode: 'approval', codeExpiresOn: null, codeExpired: false, pendingCount: 3 },
  areas: [
    { areaId: 1, name: 'Ingeniería de Sistemas', subjectCount: 12, admins: [] },
    { areaId: 2, name: 'Odontología', subjectCount: 9, admins: [{ membershipId: 21, userId: 5, name: 'Ana Torres' }] },
    { areaId: 3, name: 'Ciencias de la Salud', subjectCount: 0, admins: [] },
  ],
  admins: [
    { membershipId: 10, userId: 1, name: 'Pedro Gómez', areaId: null, areaName: null },
    { membershipId: 21, userId: 5, name: 'Ana Torres', areaId: 2, areaName: 'Odontología' },
  ],
};

function makeService() {
  return {
    overview: jest.fn(async () => overview),
    candidates: jest.fn(async () => ({
      candidates: [
        { userId: 5, name: 'Ana Torres', email: 'ana@gmail.com' },
        { userId: 8, name: 'Luis Pérez', email: 'luis@gmail.com' },
      ],
    })),
    createArea: jest.fn(async (name: string) => ({ area: { areaId: 9, name } })),
    renameArea: jest.fn(async (areaId: number, name: string) => ({ area: { areaId, name } })),
    deleteArea: jest.fn(async () => undefined),
    assignAdmin: jest.fn(async () => ({ admin: overview.admins[1] })),
    removeAdmin: jest.fn(async () => undefined),
    updateJoin: jest.fn(async () => ({ join: { ...overview.join, joinMode: 'roster' as const } })),
    regenerateCode: jest.fn(async () => ({ join: { ...overview.join, code: 'NEWCODE2' } })),
  };
}

async function renderScreen(service = makeService()) {
  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <AreasScreen institutionName="UNERG" service={service} />
    </SafeAreaProvider>,
  );
  await screen.findByText('UNERGK26');
  return service;
}

describe('AreasScreen (pantalla 34, CU-34, RF-58, RF-61, RF-63)', () => {
  it('shows the texts of design 34', async () => {
    await renderScreen();
    expect(screen.getByText('Administrador de la institución')).toBeTruthy();
    expect(screen.getByRole('header', { name: 'UNERG' })).toBeTruthy();
    expect(screen.getByText('Código de la institución')).toBeTruthy();
    expect(screen.getByText('Ingreso con aprobación · 3 por confirmar')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ingreso' })).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Áreas' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Nueva área' })).toBeTruthy();
    expect(screen.getByText('12 materias · sin administrador de área')).toBeTruthy();
    expect(screen.getByText('9 materias · administra Ana Torres')).toBeTruthy();
    expect(screen.getByText('Sin administrador de área')).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Administradores' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Agregar' })).toBeTruthy();
    expect(screen.getByText('Toda la institución')).toBeTruthy();
    expect(screen.getByText('Área de Odontología')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Quitar rol a Ana Torres' })).toBeTruthy();
    // The only institution admin offers no "Quitar rol".
    expect(screen.queryByRole('button', { name: 'Quitar rol a Pedro Gómez' })).toBeNull();
    expect(
      screen.getByText('La institución siempre conserva al menos un administrador: el último no puede quitarse el rol.'),
    ).toBeTruthy();
  });

  it('creates an area and reloads', async () => {
    const service = await renderScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Nueva área' }));
    await fireEvent.changeText(screen.getByLabelText('Nombre del área'), '  Medicina ');
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar área' }));
    await waitFor(() => expect(service.createArea).toHaveBeenCalledWith('Medicina'));
    await waitFor(() => expect(service.overview).toHaveBeenCalledTimes(2));
  });

  it('shows the server message when the area name is taken (CU-34 3a)', async () => {
    const service = makeService();
    service.createArea.mockRejectedValueOnce(
      new ApiError(409, 'AREA_NAME_TAKEN', 'Ya existe un área con ese nombre en la institución.'),
    );
    await renderScreen(service);
    await fireEvent.press(screen.getByRole('button', { name: 'Nueva área' }));
    await fireEvent.changeText(screen.getByLabelText('Nombre del área'), 'Odontología');
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar área' }));
    expect(await screen.findByText('Ya existe un área con ese nombre en la institución.')).toBeTruthy();
  });

  it('names an area admin from the active members (CU-34 steps 4-6)', async () => {
    const service = await renderScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Abrir Ciencias de la Salud' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Asignar administrador' }));
    await fireEvent.press(await screen.findByRole('radio', { name: 'Luis Pérez. luis@gmail.com' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Nombrar administrador' }));
    await waitFor(() => expect(service.assignAdmin).toHaveBeenCalledWith(8, 3));
  });

  it('names an institution admin with Agregar (6a)', async () => {
    const service = await renderScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Agregar' }));
    await fireEvent.press(await screen.findByRole('radio', { name: 'Luis Pérez. luis@gmail.com' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Nombrar administrador' }));
    await waitFor(() => expect(service.assignAdmin).toHaveBeenCalledWith(8, null));
  });

  it('removes an admin role and shows LAST_ADMIN when the server refuses', async () => {
    const service = makeService();
    service.removeAdmin.mockRejectedValueOnce(
      new ApiError(409, 'LAST_ADMIN', 'La institución siempre conserva al menos un administrador: el último no puede quitarse el rol.'),
    );
    await renderScreen(service);
    await fireEvent.press(screen.getByRole('button', { name: 'Quitar rol a Ana Torres' }));
    await waitFor(() => expect(service.removeAdmin).toHaveBeenCalledWith(21));
    expect(await screen.findByRole('alert')).toBeTruthy();
  });

  it('changes the join mode and generates a new code (RF-63, CU-37 5a)', async () => {
    const service = await renderScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Ingreso' }));
    await fireEvent.press(screen.getByRole('radio', { name: /^Solo inscritos/ }));
    await waitFor(() => expect(service.updateJoin).toHaveBeenCalledWith({ joinMode: 'roster' }));
    await fireEvent.changeText(screen.getByLabelText('Vence el (AAAA-MM-DD)'), '2027-01-31');
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar vencimiento' }));
    await waitFor(() => expect(service.updateJoin).toHaveBeenCalledWith({ codeExpiresOn: '2027-01-31' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Generar código nuevo' }));
    await waitFor(() => expect(service.regenerateCode).toHaveBeenCalled());
  });
});
