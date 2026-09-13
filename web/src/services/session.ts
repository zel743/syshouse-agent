import type { LoginResponse } from './api';

// Frontend puro web: ya no hay build nativo, así que no hace falta el
// wrapper SecureStore/localStorage que tenía app-mobil — solo localStorage.
const USER_KEY = 'auth_user';

export const saveSession = (session: LoginResponse) => {
  localStorage.setItem(USER_KEY, JSON.stringify(session));
};

export const getSession = (): LoginResponse | null => {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
};

export const clearSession = () => {
  localStorage.removeItem(USER_KEY);
};
