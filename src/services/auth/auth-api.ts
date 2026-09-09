import { apiRequest } from '../api/api-client';
import { buildSessionFromBackend, type BackendAuthUser } from '../api/backend-mappers';
import type { SessionPayload } from '../../types/auth';

type LoginWithPasswordInput = {
  email: string;
  password: string;
};

type BackendLoginResponse = {
  accessToken: string;
  user: BackendAuthUser;
};

const MICROSOFT_DEMO_PASSWORD = 'Password123';

export const loginWithPassword = async ({ email, password }: LoginWithPasswordInput) => {
  const normalizedEmail = email.trim().toLowerCase();
  const response = await apiRequest<BackendLoginResponse>('/auth/login', {
    method: 'POST',
    body: {
      email: normalizedEmail,
      password,
    },
  });

  return buildSessionFromBackend('password', response.accessToken, response.user);
};

export const loginWithMicrosoft = async (emailHint?: string) => {
  const normalizedEmail = emailHint?.trim().toLowerCase();

  if (!normalizedEmail) {
    throw new Error('Microsoft sign-in needs a work email in this build.');
  }

  const session = await loginWithPassword({
    email: normalizedEmail,
    password: MICROSOFT_DEMO_PASSWORD,
  });

  return {
    ...session,
    provider: 'microsoft',
  } satisfies SessionPayload;
};

export const restoreSession = async (session: SessionPayload) => {
  const backendUser = await apiRequest<BackendAuthUser & { assignments?: BackendAuthUser['assignments'] }>('/auth/me', {
    method: 'GET',
    requiresAuth: true,
    accessToken: session.accessToken,
  });

  return buildSessionFromBackend(session.provider, session.accessToken, backendUser);
};