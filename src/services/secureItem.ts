// One value kept between launches in encrypted storage on the phone (expo-secure-store).
// expo-secure-store has no web implementation, so the web build (development only) uses localStorage.
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export type SecureItem = {
  get(): Promise<string | null>;
  set(value: string): Promise<void>;
  clear(): Promise<void>;
};

export function secureItem(key: string): SecureItem {
  return Platform.OS === 'web'
    ? {
        get: async () => globalThis.localStorage?.getItem(key) ?? null,
        set: async (value) => globalThis.localStorage?.setItem(key, value),
        clear: async () => globalThis.localStorage?.removeItem(key),
      }
    : {
        get: () => SecureStore.getItemAsync(key),
        set: (value) => SecureStore.setItemAsync(key, value),
        clear: () => SecureStore.deleteItemAsync(key),
      };
}
