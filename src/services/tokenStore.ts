// Keeps the refresh token between launches (expo-secure-store; localStorage on the web build).
import { secureItem, type SecureItem } from './secureItem';

export type TokenStore = SecureItem;

export const tokenStore: TokenStore = secureItem('memora.refreshToken');
