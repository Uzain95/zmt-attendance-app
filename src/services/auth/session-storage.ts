import * as SecureStore from 'expo-secure-store';

import type { SessionPayload } from '../../types/auth';

const SESSION_KEY = 'zmt-session';
const BIOMETRIC_PREF_KEY = 'zmt-biometric-enabled';

export const saveSession = async (session: SessionPayload) => {
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
};

export const loadSession = async () => {
  const raw = await SecureStore.getItemAsync(SESSION_KEY);
  return raw ? (JSON.parse(raw) as SessionPayload) : null;
};

export const clearSession = async () => {
  await SecureStore.deleteItemAsync(SESSION_KEY);
};

export const setBiometricPreference = async (enabled: boolean) => {
  await SecureStore.setItemAsync(BIOMETRIC_PREF_KEY, enabled ? 'true' : 'false');
};

export const loadBiometricPreference = async () => {
  const raw = await SecureStore.getItemAsync(BIOMETRIC_PREF_KEY);
  return raw === 'true';
};