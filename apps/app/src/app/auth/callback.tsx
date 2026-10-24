import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Notice, Screen, Spinner } from '@/components/ui';
import { useAuth } from '@/lib/auth';

export default function GoogleAuthCallback() {
  const params = useLocalSearchParams<{ code?: string; error?: string }>();
  const code = Array.isArray(params.code) ? params.code[0] : params.code;
  const authError = Array.isArray(params.error) ? params.error[0] : params.error;
  const { completeGoogleSignIn } = useAuth();
  const [error, setError] = useState('');

  useEffect(() => {
    if (!code) return;
    let active = true;
    void completeGoogleSignIn(code)
      .then(() => {
        if (active) router.replace('/(tabs)/settings');
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Something went wrong.');
      });
    return () => {
      active = false;
    };
  }, [code, completeGoogleSignIn]);

  const message = error || (!code ? (authError ? 'Google sign-in did not finish.' : 'No sign-in code was returned.') : '');

  return (
    <Screen>
      {code && !error ? <Spinner /> : null}
      {message ? <Notice tone="error">{message}</Notice> : null}
      {message ? <Button title="Back to Settings" onPress={() => router.replace('/(tabs)/settings')} /> : null}
    </Screen>
  );
}