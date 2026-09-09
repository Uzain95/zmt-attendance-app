import { create } from 'zustand';

import { loginWithMicrosoft, loginWithPassword, restoreSession } from '../services/auth/auth-api';
import { authenticateReturningUser } from '../services/auth/biometric-auth';
import {
  clearSession,
  loadBiometricPreference,
  loadSession,
  saveSession,
  setBiometricPreference,
} from '../services/auth/session-storage';
import type { SessionPayload } from '../types/auth';

type AuthState = {
  isHydrated: boolean;
  isAuthenticated: boolean;
  isBusy: boolean;
  biometricEnabled: boolean;
  hasStoredSession: boolean;
  user?: SessionPayload['user'];
  provider?: SessionPayload['provider'];
  hydrate: () => Promise<void>;
  signInWithPassword: (input: { email: string; password: string; enableBiometric: boolean }) => Promise<void>;
  signInWithMicrosoft: (emailHint?: string) => Promise<void>;
  unlockWithBiometrics: () => Promise<boolean>;
  signOut: () => Promise<void>;
};

const applySession = (session: SessionPayload | null, biometricEnabled: boolean, hasStoredSession = Boolean(session)) => ({
  isAuthenticated: Boolean(session),
  hasStoredSession,
  biometricEnabled,
  user: session?.user,
  provider: session?.provider,
});

export const useAuthStore = create<AuthState>((set) => ({
  isHydrated: false,
  isAuthenticated: false,
  isBusy: false,
  biometricEnabled: false,
  hasStoredSession: false,
  user: undefined,
  provider: undefined,
  hydrate: async () => {
    set({ isBusy: true });

    try {
      const [storedSession, biometricEnabled] = await Promise.all([loadSession(), loadBiometricPreference()]);

      if (!storedSession) {
        set({
          ...applySession(null, biometricEnabled, false),
          isHydrated: true,
          isBusy: false,
        });
        return;
      }

      let nextSession: SessionPayload | null = storedSession;
      let hasStoredSession = true;

      if (!biometricEnabled) {
        try {
          nextSession = await restoreSession(storedSession);
          await saveSession(nextSession);
        } catch {
          await clearSession();
          nextSession = null;
          hasStoredSession = false;
        }
      }

      set({
        ...applySession(biometricEnabled ? null : nextSession, biometricEnabled, hasStoredSession),
        isHydrated: true,
        isBusy: false,
      });
    } catch {
      set({
        isHydrated: true,
        isBusy: false,
      });
    }
  },
  signInWithPassword: async ({ email, password, enableBiometric }) => {
    set({ isBusy: true });

    try {
      const session = await loginWithPassword({ email, password });
      await Promise.all([saveSession(session), setBiometricPreference(enableBiometric)]);

      set({
        ...applySession(session, enableBiometric),
        isHydrated: true,
        isBusy: false,
      });
    } catch (error) {
      set({ isBusy: false });
      throw error;
    }
  },
  signInWithMicrosoft: async (emailHint) => {
    set({ isBusy: true });

    try {
      const session = await loginWithMicrosoft(emailHint);
      await Promise.all([saveSession(session), setBiometricPreference(true)]);

      set({
        ...applySession(session, true),
        isHydrated: true,
        isBusy: false,
      });
    } catch (error) {
      set({ isBusy: false });
      throw error;
    }
  },
  unlockWithBiometrics: async () => {
    set({ isBusy: true });

    try {
      const [storedSession, biometricEnabled, biometricResult] = await Promise.all([
        loadSession(),
        loadBiometricPreference(),
        authenticateReturningUser(),
      ]);

      let nextSession: SessionPayload | null = storedSession;
      let shouldUnlock = Boolean(storedSession && biometricEnabled && biometricResult.success);

      if (shouldUnlock && storedSession) {
        try {
          nextSession = await restoreSession(storedSession);
          await saveSession(nextSession);
        } catch {
          await clearSession();
          nextSession = null;
          shouldUnlock = false;
        }
      }

      set({
        ...applySession(shouldUnlock ? nextSession : null, biometricEnabled, Boolean(storedSession)),
        isHydrated: true,
        isBusy: false,
      });

      return shouldUnlock;
    } catch {
      set({ isBusy: false });
      return false;
    }
  },
  signOut: async () => {
    set({ isBusy: true });

    try {
      await clearSession();
      set({
        isAuthenticated: false,
        hasStoredSession: false,
        user: undefined,
        provider: undefined,
        isBusy: false,
      });
    } catch {
      set({ isBusy: false });
    }
  },
}));