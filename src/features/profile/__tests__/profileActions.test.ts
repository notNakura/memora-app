import type { User } from '../../../services/api/client';
import type { ProfileApi } from '../../../services/api/profile';
import { createProfileActions } from '../profileActions';

const user = { id: 1 } as User;

describe('createProfileActions (to spread into the session value)', () => {
  it('calls the API with the access token and applies the returned user', async () => {
    const api = {
      updatePreferences: jest.fn(async () => ({ user })),
      leaveSection: jest.fn(async () => ({ user })),
    } as unknown as ProfileApi;
    const withAccess = <T,>(call: (token: string) => Promise<T>) => call('tok');
    const applyUser = jest.fn(async () => undefined);
    const actions = createProfileActions(withAccess, applyUser, api);

    await actions.updatePreferences({ dailyNewLimit: 25 });
    expect(api.updatePreferences).toHaveBeenCalledWith('tok', { dailyNewLimit: 25 });
    await actions.leaveSection(9);
    expect(api.leaveSection).toHaveBeenCalledWith('tok', 9);
    expect(applyUser).toHaveBeenCalledTimes(2);
    expect(applyUser).toHaveBeenCalledWith(user);
  });
});

