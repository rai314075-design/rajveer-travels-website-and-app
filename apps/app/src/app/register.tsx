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

export default function Register() {
  const t = useT();
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (busy) return;
    if (!name.trim() || !email.trim() || !password) return setError(t('fillAll'));
    if (password.length < 8) return setError(t('passwordMin'));
    setBusy(true);
    setError('');
    try {
      // The API compares phones after stripping everything except digits and "+", so send it that way.
      const cleanPhone = phone.replace(/[^\d+]/g, '');
      await signUp({ name, email, password, phone: cleanPhone || undefined });
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
      <AuthHeader title={t('createAccount')} subtitle={t('createSub')} brand={t('brand')} action={t('bookABus')} />
      <Card style={{ gap: 18, padding: 20, borderRadius: 20 }}>
        <Field label={t('name')} value={name} onChangeText={(value) => { setName(value); setError(''); }} autoCapitalize="words" autoComplete="name" />
        <Field label={t('email')} value={email} onChangeText={(value) => { setEmail(value); setError(''); }} keyboardType="email-address" autoCapitalize="none" autoComplete="email" autoCorrect={false} />
        <Field label={t('phoneOptional')} value={phone} onChangeText={(value) => { setPhone(value); setError(''); }} keyboardType="phone-pad" placeholder="+919876543210" autoComplete="tel" />
        <PasswordField label={t('password')} value={password} onChangeText={(value) => { setPassword(value); setError(''); }} autoComplete="new-password" />
        <Text style={{ color: colors.gray500, fontSize: 12, marginTop: -12 }}>{t('passwordHint')}</Text>
        {error ? <Notice tone="error">{error}</Notice> : null}
        <Button title={busy ? t('creating') : t('createAccount')} loading={busy} onPress={submit} />
        <Pressable accessibilityRole="button" onPress={() => router.replace('/login')} style={{ paddingVertical: 4 }}>
          <Text style={{ textAlign: 'center', color: colors.gray600 }}>
            {t('haveAccount')} <Text style={{ color: colors.brand600, fontWeight: '600' }}>{t('login')}</Text>
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
