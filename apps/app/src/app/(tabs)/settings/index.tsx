import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, Text, View } from 'react-native';
import { LoginPrompt } from '@/components/LoginPrompt';
import { Card, Heading, Screen } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useT } from '@/lib/i18n';
import { colors } from '@/lib/theme';

function SettingsRow({ icon, title, subtitle, onPress, danger = false }: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle?: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({
      minHeight: 68,
      paddingHorizontal: 16,
      paddingVertical: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      opacity: pressed ? 0.65 : 1,
    })}>
      <Ionicons name={icon} size={22} color={danger ? colors.red700 : colors.brand700} />
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={{ color: danger ? colors.red700 : colors.gray900, fontWeight: '600' }}>{title}</Text>
        {subtitle ? <Text style={{ color: colors.gray500, fontSize: 12 }}>{subtitle}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.gray400} />
    </Pressable>
  );
}

export default function SettingsHome() {
  const { user, signOut } = useAuth();
  const t = useT();

  if (!user) {
    return (
      <Screen>
        <Heading>{t('settings')}</Heading>
        <Text style={{ color: colors.gray500 }}>{t('settingsSub')}</Text>
        <LoginPrompt />
      </Screen>
    );
  }

  const logout = async () => {
    await signOut();
    router.replace('/(tabs)');
  };

  return (
    <Screen>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brand100 }}>
          <Text style={{ color: colors.brand700, fontWeight: '800', fontSize: 20 }}>{user.name.trim().charAt(0).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Heading style={{ fontSize: 19 }}>{user.name}</Heading>
          <Text style={{ color: colors.gray500 }}>{user.email}</Text>
        </View>
      </Card>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <SettingsRow icon="person-circle-outline" title={t('profileSettings')} subtitle={t('verification')} onPress={() => router.push('/settings/profile')} />
        <View style={{ height: 1, backgroundColor: colors.gray100 }} />
        <SettingsRow icon="ticket-outline" title={t('bookedTickets')} subtitle={t('upcomingTicketsSub')} onPress={() => router.push('/settings/bookings?view=tickets')} />
        <View style={{ height: 1, backgroundColor: colors.gray100 }} />
        <SettingsRow icon="time-outline" title={t('bookingHistory')} subtitle={t('bookingHistorySub')} onPress={() => router.push('/settings/bookings?view=history')} />
        <View style={{ height: 1, backgroundColor: colors.gray100 }} />
        <SettingsRow icon="notifications-outline" title={t('notifications')} onPress={() => router.push('/notifications')} />
        <View style={{ height: 1, backgroundColor: colors.gray100 }} />
        <SettingsRow icon="log-out-outline" title={t('logout')} subtitle={t('logoutSub')} onPress={() => void logout()} danger />
      </Card>
    </Screen>
  );
}
