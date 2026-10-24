import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/lib/auth';
import { useT } from '@/lib/i18n';
import { colors } from '@/lib/theme';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 15_000 } } });

function RootStack() {
  const { ready } = useAuth();
  const t = useT();
  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.gray950, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.brand600} size="large" />
      </View>
    );
  }
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.gray950 },
        headerTintColor: colors.white,
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: colors.gray50 },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="search" options={{ title: t('bookABus') }} />
      <Stack.Screen name="trip/[id]" options={{ title: t('tripTitle') }} />
      <Stack.Screen name="login" options={{ title: t('login') }} />
      <Stack.Screen name="register" options={{ title: t('register') }} />
      <Stack.Screen name="auth/callback" options={{ title: t('googleSignIn') }} />
      <Stack.Screen name="notifications" options={{ title: t('notifications') }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <StatusBar style="light" />
        <RootStack />
      </AuthProvider>
    </QueryClientProvider>
  );
}
