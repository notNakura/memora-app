const mockMemory = new Map<string, string>();

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (key: string) => mockMemory.get(key) ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => {
    mockMemory.set(key, value);
  }),
  deleteItemAsync: jest.fn(async (key: string) => {
    mockMemory.delete(key);
  }),
}));

import { signupChoiceStore } from '../signupChoiceStore';

beforeEach(() => mockMemory.clear());

describe('signupChoiceStore (only on the phone, expo-secure-store)', () => {
  it('is empty until a choice is saved', async () => {
    expect(await signupChoiceStore.get()).toBeNull();
  });

  it('saves, reads and clears the choice', async () => {
    await signupChoiceStore.set('teacher');
    expect(await signupChoiceStore.get()).toBe('teacher');
    expect(mockMemory.get('memora.signupChoice')).toBe('teacher');

    await signupChoiceStore.clear();
    expect(await signupChoiceStore.get()).toBeNull();
  });

  it('keeps the institution choice of the screen 1 link', async () => {
    await signupChoiceStore.set('institution');
    expect(await signupChoiceStore.get()).toBe('institution');
  });

  it('ignores an unknown stored value', async () => {
    mockMemory.set('memora.signupChoice', 'admin');
    expect(await signupChoiceStore.get()).toBeNull();
  });
});
