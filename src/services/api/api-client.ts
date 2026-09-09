import { Platform } from 'react-native';

import { loadSession } from '../auth/session-storage';

const resolveDefaultApiBaseUrl = () => {
  const host = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
  return `http://${host}:3000/api`;
};

const normalizeBaseUrl = (value: string) => value.replace(/\/+$/, '');

export const API_BASE_URL = normalizeBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL ?? resolveDefaultApiBaseUrl());

type ApiRequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  requiresAuth?: boolean;
  accessToken?: string;
};

const extractErrorMessage = async (response: Response) => {
  try {
    const payload = (await response.json()) as { message?: string };
    if (payload.message) {
      return payload.message;
    }
  } catch {
    // Ignore JSON parsing failures and fall back to status text.
  }

  return response.statusText || `Request failed with status ${response.status}`;
};

export const apiRequest = async <T>(path: string, { body, requiresAuth = false, accessToken, headers, ...init }: ApiRequestOptions = {}) => {
  const session = requiresAuth && !accessToken ? await loadSession() : null;
  const bearerToken = accessToken ?? session?.accessToken;

  if (requiresAuth && !bearerToken) {
    throw new Error('Your session has expired. Please sign in again.');
  }

  const response = await fetch(`${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {}),
      ...(headers ?? {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const raw = await response.text();
  return (raw ? (JSON.parse(raw) as T) : undefined) as T;
};