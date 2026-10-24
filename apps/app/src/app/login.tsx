import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { AuthHeader } from '@/components/AuthHeader';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';
import { PasswordField } from '@/components/PasswordField';
import { Button, Card, Field, Notice, Screen } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useT } from '@/lib/i18n';
import { colors } from '@/lib/theme';

export default function Login() {
  const t = useT();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (busy) return;
    if (!email.trim() || !password) return setError(t('fillAll'));
    setBusy(true);
    setError('');
    try {
      await signIn(email, password);
      if (router.canGoBack()) router.back();
      else router.replace('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : t('error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <AuthHeader title={t('welcomeBack')} subtitle={t('loginSub')} brand={t('brand')} action={t('bookABus')} />
      <Card style={{ gap: 18, padding: 20, borderRadius: 20 }}>
        <Field label={t('email')} value={email} onChangeText={(value) => { setEmail(value); setError(''); }} placeholder="john@example.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" autoCorrect={false} />
        <PasswordField label={t('password')} value={password} onChangeText={(value) => { setPassword(value); setError(''); }} autoComplete="current-password" onSubmitEditing={submit} returnKeyType="go" />
        {error ? <Notice tone="error">{error}</Notice> : null}
        <Button title={busy ? t('loggingIn') : t('login')} loading={busy} onPress={submit} />
        <Pressable accessibilityRole="button" onPress={() => router.replace('/register')} style={{ paddingVertical: 4 }}>
          <Text style={{ textAlign: 'center', color: colors.gray600 }}>
            {t('noAccount')} <Text style={{ color: colors.brand600, fontWeight: '600' }}>{t('register')}</Text>
          </Text>
        </Pressable>
        <GoogleSignInButton dividerLabel={t('or')} dividerPosition="before" />
      </Card>
      <View style={{ alignItems: 'center', paddingHorizontal: 16 }}>
        <Text style={{ color: colors.gray500, fontSize: 12, textAlign: 'center', lineHeight: 18 }}>{t('authBookingHint')}</Text>
      </View>
    </Screen>
  );
}
