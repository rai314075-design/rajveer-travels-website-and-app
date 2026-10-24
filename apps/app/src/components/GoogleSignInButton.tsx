import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Notice } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useT } from '@/lib/i18n';
import { colors, radius } from '@/lib/theme';

export function GoogleSignInButton({ dividerLabel, dividerPosition = 'after' }: { dividerLabel?: string; dividerPosition?: 'before' | 'after' }) {
  const { startGoogleSignIn } = useAuth();
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const openGoogle = async () => {
    setError('');
    setBusy(true);
    try {
      await startGoogleSignIn();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('error'));
    } finally {
      setBusy(false);
    }
  };

  const divider = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ height: 1, flex: 1, backgroundColor: colors.gray200 }} />
      <Text style={{ color: colors.gray400, fontSize: 12 }}>{dividerLabel ?? t('orEmail')}</Text>
      <View style={{ height: 1, flex: 1, backgroundColor: colors.gray200 }} />
    </View>
  );

  return (
    <View style={{ gap: 14 }}>
      {dividerPosition === 'before' ? divider : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('continueGoogle')}
        disabled={busy}
        onPress={() => void openGoogle()}
        style={({ pressed }) => ({
          minHeight: 48,
          borderRadius: radius.sm,
          borderWidth: 1,
          borderColor: colors.gray300,
          backgroundColor: colors.white,
          opacity: busy ? 0.6 : pressed ? 0.8 : 1,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
        })}
      >
        <Text style={{ color: '#4285F4', fontSize: 19, fontWeight: '800' }}>G</Text>
        <Text style={{ color: colors.gray900, fontSize: 15, fontWeight: '600' }}>
          {busy ? t('openingGoogle') : t('continueGoogle')}
        </Text>
      </Pressable>
      {error ? <Notice tone="error">{error}</Notice> : null}
      {dividerPosition === 'after' ? divider : null}
    </View>
  );
}
