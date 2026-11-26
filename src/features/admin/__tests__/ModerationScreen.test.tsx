import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { AuditEntry } from '../../../services/api/admin';
import { auditDescription, whenText } from '../adminText';
import { ModerationScreen } from '../ModerationScreen';

jest.mock('expo-haptics', () => ({ selectionAsync: jest.fn(() => Promise.resolve()) }));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const NOW = new Date('2026-11-20T15:00:00'); // a Friday

const entry = (e: Partial<AuditEntry>): AuditEntry => ({
  auditId: '1',
  occurredAt: '2026-11-20T10:12:00',
  userId: 1,
  actorName: 'Pedro Gómez',
  action: 'deck_hidden',
  tableName: 'deck',
  recordId: '5',
  oldValue: null,
  newValue: null,
  ...e,
});

const entries: AuditEntry[] = [
  entry({ auditId: '9', action: 'deck_hidden', newValue: { isHidden: true, name: 'Física I – fórmulas' } }),
  entry({
    auditId: '8',
    occurredAt: '2026-11-16T09:05:00',
    action: 'roster_imported',
    newValue: { fileName: 'inscritos_SI3_2026-II.csv', created: 30 },
  }),
];

function makeService() {
  return {
    reported: jest.fn(async () => ({
      decks: [
        {
          deckId: 5,
          name: 'Física I – fórmulas',
          visibility: 'institution' as const,
          authorName: 'Carla Rojas',
          cardCount: 40,
          studentCount: 12,
          reportCount: 3,
          isHidden: false,
        },
      ],
      cards: [{ cardId: 70, deckId: 5, deckName: 'Física I – fórmulas', front: 'F = ?', reportCount: 1, isHidden: false }],
    })),
    deckAction: jest.fn(async (deckId: number) => ({ deck: { deckId, isHidden: true } })),
    cardAction: jest.fn(async (cardId: number) => ({ card: { cardId, isHidden: true } })),
    audit: jest.fn(async () => ({ entries, nextBefore: '8' as string | null })),
  };
}

async function renderScreen(service = makeService()) {
  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <ModerationScreen institutionName="UNERG" service={service} now={() => NOW} />
    </SafeAreaProvider>,
  );
  await screen.findByText('Física I – fórmulas');
  await screen.findByText('ocultó el mazo Física I – fórmulas');
  return service;
}

describe('ModerationScreen (pantalla 37, CU-29, CU-32, RF-49, RF-54)', () => {
  it('shows the texts of design 37', async () => {
    await renderScreen();
    expect(screen.getByText('Administrador · UNERG')).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Moderación' })).toBeTruthy();
    expect(screen.getByText('Reportado 3 veces · contenido inapropiado')).toBeTruthy();
    expect(screen.getByText('Público para toda la institución · 40 tarjetas · 12 estudiantes lo usan')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Mantener' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ocultar mazo' })).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Bitácora' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Filtrar' })).toBeTruthy();
    expect(screen.getAllByText('Pedro Gómez')).toHaveLength(2);
    expect(screen.getByText('Hoy, 10:12 a. m.')).toBeTruthy();
    expect(screen.getByText('importó 30 usuarios')).toBeTruthy();
    expect(screen.getByText('inscritos_SI3_2026-II.csv · lunes, 9:05 a. m.')).toBeTruthy();
  });

  it('hides a deck, keeps a deck and hides a reported card', async () => {
    const service = await renderScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Ocultar mazo' }));
    await waitFor(() => expect(service.deckAction).toHaveBeenCalledWith(5, 'hide'));
    await fireEvent.press(screen.getByRole('button', { name: 'Mantener' }));
    await waitFor(() => expect(service.deckAction).toHaveBeenCalledWith(5, 'keep'));
    await fireEvent.press(screen.getByRole('button', { name: 'Ocultar tarjeta' }));
    await waitFor(() => expect(service.cardAction).toHaveBeenCalledWith(70, 'hide'));
  });

  it('filters the log by action and loads more with the cursor', async () => {
    const service = await renderScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Ver más' }));
    await waitFor(() => expect(service.audit).toHaveBeenLastCalledWith({ action: undefined, before: '8', limit: 30 }));
    await fireEvent.press(screen.getByRole('button', { name: 'Filtrar' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Mazos ocultados' }));
    await waitFor(() => expect(service.audit).toHaveBeenLastCalledWith({ action: 'deck_hidden', before: undefined, limit: 30 }));
  });
});

describe('admin texts', () => {
  it('dates of the log like design 37', () => {
    expect(whenText('2026-11-20T10:12:00', NOW)).toBe('hoy, 10:12 a. m.');
    expect(whenText('2026-11-19T18:40:00', NOW)).toBe('ayer, 6:40 p. m.');
    expect(whenText('2026-11-02T16:15:00', NOW)).toBe('2 nov, 4:15 p. m.');
  });

  it('describes approvals with the name kept in the log', () => {
    expect(auditDescription(entry({ action: 'membership_approved', newValue: { name: 'José Ramírez' } }))).toBe(
      'aprobó la solicitud de José Ramírez',
    );
  });
});
