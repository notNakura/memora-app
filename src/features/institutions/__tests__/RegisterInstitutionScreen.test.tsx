import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ApiError } from '../../../services/api/client';
import { RegisterInstitutionScreen } from '../RegisterInstitutionScreen';

jest.mock('expo-haptics', () => ({ selectionAsync: jest.fn(() => Promise.resolve()) }));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

type Props = Parameters<typeof RegisterInstitutionScreen>[0];
async function renderScreen(props: Partial<Props> = {}) {
  const handlers: Props = {
    email: 'pedro.gomez@gmail.com',
    onRegister: jest.fn(async () => undefined),
    ...props,
  };
  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <RegisterInstitutionScreen {...handlers} />
    </SafeAreaProvider>,
  );
  return handlers;
}

const NAME = 'Universidad Nacional Experimental Rómulo Gallegos';
const TAKEN = 'Ya existe una institución con ese nombre. Confirma que se trata de otra.';
const typeName = (name: string) => fireEvent.changeText(screen.getByLabelText('Nombre de la institución'), name);
const pressRegister = () => fireEvent.press(screen.getByRole('button', { name: 'Registrar institución' }));

describe('RegisterInstitutionScreen (pantalla 33, RF-57, CU-33)', () => {
  it('shows the texts of the design with the verified email as contact', async () => {
    await renderScreen();
    expect(screen.getByRole('header', { name: 'Registrar mi institución' })).toBeTruthy();
    expect(
      screen.getByText(
        'Registra tu universidad, instituto o curso. Quedarás como su administrador y podrás crear áreas, cargar usuarios y nombrar a otros administradores.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Tipo')).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Universidad. Con áreas, lapsos y varias materias' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Instituto. Institutos y colegios universitarios' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Curso. Un curso o diplomado con pocas materias' })).toBeTruthy();
    expect(screen.getByText('Correo de contacto')).toBeTruthy();
    expect(screen.getByText('pedro.gomez@gmail.com')).toBeTruthy();
    expect(screen.getByText('Verificado')).toBeTruthy();
    expect(screen.getByText('Es el correo de tu cuenta. La institución lo usará para avisos de Memora.')).toBeTruthy();
    expect(screen.getByText('REGISTRAR INSTITUCIÓN')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Volver' })).toBeNull();
  });

  it('registers with the trimmed name and the chosen type', async () => {
    const { onRegister } = await renderScreen();
    await typeName(`  ${NAME} `);
    await fireEvent.press(screen.getByRole('radio', { name: /^Curso/ }));
    await pressRegister();
    expect(onRegister).toHaveBeenCalledWith({ name: NAME, type: 'course' });
  });

  it('asks for the name before sending', async () => {
    const { onRegister } = await renderScreen();
    await typeName('   ');
    await pressRegister();
    expect(onRegister).not.toHaveBeenCalled();
    expect(screen.getByText('Escribe el nombre de la institución.')).toBeTruthy();
  });

  it('CU-33 4a: a duplicate name asks to confirm it is another institution, then sends the confirmation', async () => {
    const onRegister = jest
      .fn()
      .mockRejectedValueOnce(new ApiError(409, 'INSTITUTION_NAME_TAKEN', TAKEN))
      .mockResolvedValueOnce(undefined);
    await renderScreen({ onRegister });
    await typeName('UNERG');
    await pressRegister();
    expect(await screen.findByText(TAKEN)).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Sí, es otra institución' }));
    expect(onRegister).toHaveBeenLastCalledWith({ name: 'UNERG', type: 'university', confirmDuplicate: true });
  });

  it('changing the name after the duplicate warning asks again from the start', async () => {
    const onRegister = jest.fn().mockRejectedValueOnce(new ApiError(409, 'INSTITUTION_NAME_TAKEN', TAKEN));
    await renderScreen({ onRegister });
    await typeName('UNERG');
    await pressRegister();
    await screen.findByText(TAKEN);
    await typeName('UNERG Núcleo Calabozo');
    expect(screen.queryByText(TAKEN)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Sí, es otra institución' })).toBeNull();
  });

  it('shows other server errors', async () => {
    await renderScreen({
      onRegister: jest.fn(() => Promise.reject(new ApiError(0, 'NETWORK', 'No pudimos conectar con Memora.'))),
    });
    await typeName('UNERG');
    await pressRegister();
    expect(await screen.findByText('No pudimos conectar con Memora.')).toBeTruthy();
  });

  it('shows Volver when opened from another screen', async () => {
    const onBack = jest.fn();
    await renderScreen({ onBack });
    await fireEvent.press(screen.getByRole('button', { name: 'Volver' }));
    expect(onBack).toHaveBeenCalled();
  });
});
