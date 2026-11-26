import { act, render, screen } from '@testing-library/react-native';
import type { SyncOutcome } from '../syncNow';

let mockFinished: ((o: SyncOutcome) => void) | null = null;
jest.mock('../useAutoSync', () => ({ useAutoSync: jest.fn() }));
jest.mock('../syncNow', () => ({
  onSyncFinished: (listener: (o: SyncOutcome) => void) => {
    mockFinished = listener;
    return () => {
      mockFinished = null;
    };
  },
}));

const mockWithAccess = jest.fn();
let mockSessionUser: { id: number } | null = { id: 7 };
jest.mock('../../../features/auth/session', () => ({
  useSession: () => ({ user: mockSessionUser, withAccess: mockWithAccess }),
}));

import { SyncRunner } from '../SyncRunner';
import { useAutoSync } from '../useAutoSync';

const mockUseAutoSync = useAutoSync as jest.Mock;

const outcome = (notices: string[]): SyncOutcome => ({
  result: 'success',
  offline: false,
  sent: 0,
  received: 0,
  conflicts: 0,
  rejected: 0,
  notices,
});

beforeEach(() => {
  mockUseAutoSync.mockClear();
  mockSessionUser = { id: 7 };
});

it('starts automatic sync for the signed-in user with the session access helper', async () => {
  await render(<SyncRunner />);
  expect(mockUseAutoSync).toHaveBeenCalledWith({ userId: 7, call: mockWithAccess });
});

it('passes no user when nobody is signed in', async () => {
  mockSessionUser = null;
  await render(<SyncRunner />);
  expect(mockUseAutoSync).toHaveBeenCalledWith({ userId: null, call: mockWithAccess });
});

it('shows the notices of a finished sync (suspended or removed institutions)', async () => {
  await render(<SyncRunner />);
  expect(screen.queryByText(/suspendida/)).toBeNull();
  await act(() => mockFinished?.(outcome(['La institución UNERG está suspendida: sus datos quedan en solo lectura.'])));
  expect(screen.getByText('La institución UNERG está suspendida: sus datos quedan en solo lectura.')).toBeTruthy();
});

it('shows nothing for a sync without notices', async () => {
  await render(<SyncRunner />);
  await act(() => mockFinished?.(outcome([])));
  expect(screen.toJSON()).toBeNull();
});
