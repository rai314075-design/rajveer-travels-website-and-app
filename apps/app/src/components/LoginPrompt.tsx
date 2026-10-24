import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { useT } from '@/lib/i18n';
import { Button, Card, Heading } from './ui';
import { GoogleSignInButton } from './GoogleSignInButton';
import { colors } from '@/lib/theme';

export function LoginPrompt({ title, subtitle }: { title?: string; subtitle?: string }) {
  const t = useT();
  return (
    <Card style={{ gap: 12 }}>
      <Heading>{title ?? t('guestTitle')}</Heading>
      <Text style={{ color: colors.gray500, lineHeight: 20 }}>{subtitle ?? t('guestSub')}</Text>
      <GoogleSignInButton />
      <View style={{ gap: 8 }}>
        <Button title={t('login')} onPress={() => router.push('/login')} />
        <Button title={t('register')} variant="outline" onPress={() => router.push('/register')} />
      </View>
    </Card>
  );
}
