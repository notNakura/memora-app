import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ApiError, type User } from '../../../services/api/client';
import type { JoinOutcome, SectionPreview } from '../../../services/api/onboarding';
import { JoinSectionScreen } from '../JoinSectionScreen';

jest.mock('expo-haptics', () => ({ selectionAsync: jest.fn(() => Promise.resolve()) }));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

const user: User = {
  id: 1,
  email: 'luis.perez@gmail.com',
  emailVerified: true,
  profileComplete: true,
  nationalId: 'V-20000001',
  firstNames: 'Luis',
  lastNames: 'Pérez',
  birthDate: null,
  sex: null,
  onboardingCompleted: true,
  memberships: [],
  enrollments: [],
};

const preview: SectionPreview = {
  code: 'SK3A26',
  institutionName: 'UNERG',
  areaName: 'Ingeniería de Sistemas',
  subjectName: 'Sistemas de Información III',
  sectionName: 'Sección 1',
  termName: '2026-II',
  teacherName: 'María Hernández',
  deckCount: 2,
  assessmentCount: 1,
  outcome: 'active',
};

type Props = Parameters<typeof JoinSectionScreen>[0];
async function renderScreen(props: Partial<Props> = {}) {
  const handlers: Props = {
    user,
    onPreview: jest.fn(async () => preview),
    onJoin: jest.fn(async (): Promise<JoinOutcome> => 'active'),
    onOpenInstitutions: jest.fn(),
    ...props,
  };
  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <JoinSectionScreen {...handlers} />
    </SafeAreaProvider>,
  );
  return handlers;
}

const typeCode = (code: string) => fireEvent.changeText(screen.getByLabelText('Código de la sección'), code);

describe('JoinSectionScreen (pantalla 05, RF-04, CU-35)', () => {
  it('shows the texts of the design, the link to Mis instituciones and no Volver when it is the start screen', async () => {
    const { onOpenInstitutions } = await renderScreen();
    expect(screen.getByRole('header', { name: 'Unirme a una sección' })).toBeTruthy();
    expect(
      screen.getByText('Escribe el código de 6 caracteres, abre el enlace que te enviaron o escanea el QR que proyecta tu profesor.'),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Escanear código QR' })).toBeTruthy();
    expect(screen.getByText('UNIRME')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Volver' })).toBeNull();
    await fireEvent.press(screen.getByRole('link', { name: 'Mis instituciones' }));
    expect(onOpenInstitutions).toHaveBeenCalled();
  });

  it('shows Volver when opened from another screen', async () => {
    const onBack = jest.fn();
    await renderScreen({ onBack });
    await fireEvent.press(screen.getByRole('button', { name: 'Volver' }));
    expect(onBack).toHaveBeenCalled();
  });

  it('the QR scanner shows the "disponible pronto" notice', async () => {
    await renderScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Escanear código QR' }));
    expect(screen.getByText('Escanear el código QR estará disponible pronto en Memora.')).toBeTruthy();
  });

  it('loads the preview when the 6th character is typed (upper-cased)', async () => {
    const { onPreview } = await renderScreen();
    await typeCode('sk3a2');
    expect(onPreview).not.toHaveBeenCalled();
    await typeCode('sk3a26');
    expect(onPreview).toHaveBeenCalledWith('SK3A26');
    expect(await screen.findByText('UNERG · Ingeniería de Sistemas')).toBeTruthy();
    expect(screen.getByText('Sistemas de Información III')).toBeTruthy();
    expect(screen.getByText('Sección 1 · Lapso 2026-II')).toBeTruthy();
    expect(screen.getByText('Docente: María Hernández')).toBeTruthy();
    expect(screen.getByText('2 mazos asignados · 1 evaluación programada')).toBeTruthy();
    expect(screen.getByText('Entras de inmediato')).toBeTruthy();
  });

  it('starts the preview from a code given by another screen', async () => {
    const { onPreview } = await renderScreen({ initialCode: 'SK3A26' });
    expect(onPreview).toHaveBeenCalledWith('SK3A26');
    expect(await screen.findByText('Sistemas de Información III')).toBeTruthy();
  });

  it('says the person is on the roster when an invited enrollment matches the section', async () => {
    const invited = {
      sectionId: 4,
      institutionId: 1,
      subjectName: 'Sistemas de Información III',
      sectionName: 'Sección 1',
      status: 'invited' as const,
    };
    await renderScreen({ user: { ...user, enrollments: [invited] } });
    await typeCode('SK3A26');
    expect(await screen.findByText('Estás en la lista de inscritos: entras de inmediato')).toBeTruthy();
  });

  it('says the request stays pending for approval sections', async () => {
    await renderScreen({
      onPreview: jest.fn(async () => ({ ...preview, outcome: 'pending' as const, deckCount: 1, assessmentCount: 0 })),
    });
    await typeCode('SK3A26');
    expect(await screen.findByText('Tu solicitud queda por confirmar')).toBeTruthy();
    expect(screen.getByText('1 mazo asignado · 0 evaluaciones programadas')).toBeTruthy();
  });

  it('rejects characters outside the code alphabet without calling the server (RNF-14)', async () => {
    const { onPreview } = await renderScreen();
    await typeCode('SK3AO6');
    expect(onPreview).not.toHaveBeenCalled();
    expect(screen.getByText('El código solo usa los números del 2 al 9 y letras sin I ni O.')).toBeTruthy();
  });

  it('Unirme without a full code says what is missing', async () => {
    const { onJoin } = await renderScreen();
    await typeCode('SK3');
    await fireEvent.press(screen.getByRole('button', { name: 'Unirme' }));
    expect(onJoin).not.toHaveBeenCalled();
    expect(screen.getByText('Escribe los 6 caracteres del código.')).toBeTruthy();
  });

  it('Unirme joins with the code and says the outcome', async () => {
    const { onJoin } = await renderScreen({ onJoin: jest.fn(async (): Promise<JoinOutcome> => 'pending') });
    await typeCode('SK3A26');
    await screen.findByText('Sistemas de Información III');
    await fireEvent.press(screen.getByRole('button', { name: 'Unirme' }));
    expect(onJoin).toHaveBeenCalledWith('SK3A26');
    expect(await screen.findByText('Tu solicitud quedó por confirmar. La institución la revisará.')).toBeTruthy();
  });

  it('Unirme for a section the person already belongs to says so (CU-35 6b)', async () => {
    await renderScreen({ onJoin: jest.fn(async (): Promise<JoinOutcome> => 'already') });
    await typeCode('SK3A26');
    await screen.findByText('Sistemas de Información III');
    await fireEvent.press(screen.getByRole('button', { name: 'Unirme' }));
    expect(await screen.findByText('Ya perteneces a esta sección.')).toBeTruthy();
  });

  it('calls onJoined when the person enters right away', async () => {
    const onJoined = jest.fn();
    await renderScreen({ onJoined });
    await typeCode('SK3A26');
    await screen.findByText('Sistemas de Información III');
    await fireEvent.press(screen.getByRole('button', { name: 'Unirme' }));
    await waitFor(() => expect(onJoined).toHaveBeenCalledWith('active'));
  });

  it.each([
    ['JOIN_CODE_NOT_FOUND', 404, 'No encontramos ese código. Revísalo e intenta de nuevo.'],
    ['JOIN_CODE_EXPIRED', 410, 'Ese código ya venció. Pide uno nuevo a tu institución.'],
    ['INSTITUTION_SUSPENDED', 403, 'Esta institución no está disponible por ahora.'],
    ['TOO_MANY_ATTEMPTS', 429, 'Demasiados intentos. Espera unos minutos.'],
  ])('shows the server message for %s on the preview (CU-35 3a)', async (code, status, message) => {
    await renderScreen({ onPreview: jest.fn(() => Promise.reject(new ApiError(status, code, message))) });
    await typeCode('SK3A26');
    expect(await screen.findByText(message)).toBeTruthy();
    expect(screen.queryByText('Sistemas de Información III')).toBeNull();
  });

  it('shows SECTION_FULL when joining', async () => {
    await renderScreen({
      onJoin: jest.fn(() => Promise.reject(new ApiError(409, 'SECTION_FULL', 'Esta sección ya no tiene cupo.'))),
    });
    await typeCode('SK3A26');
    await screen.findByText('Sistemas de Información III');
    await fireEvent.press(screen.getByRole('button', { name: 'Unirme' }));
    expect(await screen.findByText('Esta sección ya no tiene cupo.')).toBeTruthy();
  });

  it('lists pending enrollments with "Por confirmar"', async () => {
    const pending = {
      sectionId: 9,
      institutionId: 1,
      subjectName: 'Cálculo I',
      sectionName: 'Sección 2',
      status: 'pending' as const,
    };
    const active = { ...pending, sectionId: 10, subjectName: 'Física I', status: 'active' as const };
    await renderScreen({ user: { ...user, enrollments: [pending, active] } });
    expect(screen.getByText('Cálculo I · Sección 2')).toBeTruthy();
    expect(screen.getByText('Por confirmar')).toBeTruthy();
    expect(screen.queryByText(/Física I/)).toBeNull();
  });
});
