import { Stack } from 'expo-router';
import { useT } from '@/lib/i18n';
import { colors } from '@/lib/theme';

export default function SettingsLayout() {
  const t = useT();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.gray950 },
        headerTintColor: colors.white,
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: colors.gray50 },
      }}
    >
      <Stack.Screen name="index" options={{ title: t('settings') }} />
      <Stack.Screen name="profile" options={{ title: t('profile') }} />
      <Stack.Screen name="bookings" options={{ title: t('bookingHistory') }} />
    </Stack>
  );
}
