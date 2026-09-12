import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { LoginResponse } from './api';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

// expo-secure-store has no web implementation, so we fall back to
// localStorage on web and keep the native secure storage everywhere else.
const isWeb = Platform.OS === 'web';

const setItem = (key: string, value: string) =>
  isWeb ? Promise.resolve(window.localStorage.setItem(key, value)) : SecureStore.setItemAsync(key, value);

const getItem = (key: string) =>
  isWeb ? Promise.resolve(window.localStorage.getItem(key)) : SecureStore.getItemAsync(key);

const deleteItem = (key: string) =>
  isWeb ? Promise.resolve(window.localStorage.removeItem(key)) : SecureStore.deleteItemAsync(key);

export const saveSession = async (session: LoginResponse) => {
  await setItem(TOKEN_KEY, session.token);
  await setItem(USER_KEY, JSON.stringify(session));
};

export const getSession = async (): Promise<LoginResponse | null> => {
  const raw = await getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
};

export const clearSession = async () => {
  await deleteItem(TOKEN_KEY);
  await deleteItem(USER_KEY);
};
