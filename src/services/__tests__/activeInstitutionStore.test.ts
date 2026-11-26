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

import { activeInstitutionStore } from '../activeInstitutionStore';

beforeEach(() => mockMemory.clear());

describe('activeInstitutionStore (only on the phone, expo-secure-store)', () => {
  it('is empty until an institution is chosen', async () => {
    expect(await activeInstitutionStore.get()).toBeNull();
  });

  it('saves, reads and clears the active institution id', async () => {
    await activeInstitutionStore.set(12);
    expect(mockMemory.get('memora.activeInstitution')).toBe('12');
    expect(await activeInstitutionStore.get()).toBe(12);

    await activeInstitutionStore.clear();
    expect(await activeInstitutionStore.get()).toBeNull();
  });

  it('ignores a stored value that is not a positive whole number', async () => {
    mockMemory.set('memora.activeInstitution', 'abc');
    expect(await activeInstitutionStore.get()).toBeNull();
    mockMemory.set('memora.activeInstitution', '-3');
    expect(await activeInstitutionStore.get()).toBeNull();
  });
});

describe('activeInstitutionStore active role', () => {
  it('has no role until one is chosen', async () => {
    await activeInstitutionStore.set(12);
    expect(await activeInstitutionStore.getRole()).toBeNull();
  });

  it('keeps the chosen role next to the active institution', async () => {
    await activeInstitutionStore.set(12, 'teacher');
    expect(await activeInstitutionStore.get()).toBe(12);
    expect(mockMemory.get('memora.activeRole')).toBe('teacher');
    expect(await activeInstitutionStore.getRole()).toBe('teacher');
  });

  it('choosing an institution without a role forgets the previous role', async () => {
    await activeInstitutionStore.set(12, 'teacher');
    await activeInstitutionStore.set(7);
    expect(await activeInstitutionStore.get()).toBe(7);
    expect(await activeInstitutionStore.getRole()).toBeNull();
  });

  it('clear forgets the institution and the role', async () => {
    await activeInstitutionStore.set(12, 'institution_admin');
    await activeInstitutionStore.clear();
    expect(await activeInstitutionStore.get()).toBeNull();
    expect(await activeInstitutionStore.getRole()).toBeNull();
  });

  it('ignores a stored value that is not a role', async () => {
    mockMemory.set('memora.activeRole', 'platform_admin');
    expect(await activeInstitutionStore.getRole()).toBeNull();
  });
});
