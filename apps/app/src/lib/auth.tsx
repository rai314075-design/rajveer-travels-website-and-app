import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { api, ApiError, loadToken, setToken, setUnauthorizedHandler } from './api';
import { API_URL } from './config';
import { UserResponseSchema, type User } from '@rajveer/shared';

interface AuthValue {
  user: User | null;
  ready: boolean;
  /** Email + phone both verified â€” same rule the website uses before allowing bookings. */
  canBook: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  startGoogleSignIn: () => Promise<void>;
  completeGoogleSignIn: (code: string) => Promise<void>;
  signUp: (input: { name: string; email: string; password: string; phone?: string }) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const queryClient = useQueryClient();

  const refresh = useCallback(async () => {
    try {
      const data = await api('/api/me', { schema: UserResponseSchema });
      setUser(data.user);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        await setToken(null);
        setUser(null);
      }
      // Network errors: keep the stored token, the user can retry.
    }
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      void setToken(null);
      setUser(null);
    });
    (async () => {
      const token = await loadToken();
      if (token) await refresh();
      setReady(true);
    })();
    return () => setUnauthorizedHandler(null);
  }, [refresh]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const data = await api<{ token: string }>('/api/login', {
        method: 'POST',
        body: { email: email.trim().toLowerCase(), password },
      });
      await setToken(data.token);
      queryClient.clear();
      await refresh();
    },
    [queryClient, refresh],
  );

  const signUp = useCallback(
    async (input: { name: string; email: string; password: string; phone?: string }) => {
      await api('/api/register', {
        method: 'POST',
        body: { ...input, name: input.name.trim(), email: input.email.trim().toLowerCase() },
      });
      await signIn(input.email, input.password);
    },
    [signIn],
  );

  const startGoogleSignIn = useCallback(async () => {
    // Expo Linking creates exp:// callbacks in Expo Go and uses the app's
    // rajveertravels:// scheme in a native build.
    const redirectUri = Linking.createURL('auth/callback');
    const loginUrl = new URL(`${API_URL}/api/auth/login`);
    loginUrl.searchParams.set('method', 'google');
    loginUrl.searchParams.set('client', 'mobile');
    loginUrl.searchParams.set('redirectUri', redirectUri);
    await Linking.openURL(loginUrl.toString());
  }, []);

  const completeGoogleSignIn = useCallback(
    async (code: string) => {
      const data = await api<{ token: string }>('/api/mobile/auth/exchange', {
        method: 'POST',
        body: { code },
      });
      await setToken(data.token);
      queryClient.clear();
      await refresh();
    },
    [queryClient, refresh],
  );

  const signOut = useCallback(async () => {
    await setToken(null);
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  const value = useMemo<AuthValue>(
    () => ({ user, ready, canBook: Boolean(user?.phoneVerified && user?.emailVerified), signIn, signUp, startGoogleSignIn, completeGoogleSignIn, signOut, refresh }),
    [user, ready, signIn, signUp, startGoogleSignIn, completeGoogleSignIn, signOut, refresh],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

