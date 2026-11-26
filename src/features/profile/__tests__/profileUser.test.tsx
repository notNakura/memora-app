import { act, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import type { User } from '../../../services/api/client';

const sessionA = { id: 1, dailyNewLimit: 20 } as User;
let mockSessionUser: User | null = sessionA;
jest.mock('../../auth/session', () => ({ useSession: () => ({ user: mockSessionUser }) }));

import { keepFreshUser, useProfileUser } from '../profileActions';

function Probe() {
  return <Text>{String(useProfileUser()?.dailyNewLimit)}</Text>;
}

it('shows the user a profile route received until the session holds another user', async () => {
  const view = await render(<Probe />);
  expect(screen.getByText('20')).toBeTruthy();

  await act(async () => keepFreshUser(sessionA, { ...sessionA, dailyNewLimit: 25 }));
  expect(screen.getByText('25')).toBeTruthy();

  mockSessionUser = { ...sessionA, dailyNewLimit: 30 }; // e.g. a token refresh brought a new user
  await view.rerender(<Probe />);
  expect(screen.getByText('30')).toBeTruthy();
});
