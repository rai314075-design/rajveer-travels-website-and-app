import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { NotificationBell } from '@/components/NotificationBell';
import { useT } from '@/lib/i18n';
import { colors } from '@/lib/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export default function TabsLayout() {
  const t = useT();
  const icon = (name: IconName, focused: IconName) =>
    function TabBarIcon({ color, focused: f, size }: { color: ColorValue; focused: boolean; size: number }) {
      return <Ionicons name={f ? focused : name} size={size} color={color as string} />;
    };
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.gray950 },
        headerTintColor: colors.white,
        headerTitleStyle: { fontWeight: '700' },
        headerRight: () => <NotificationBell />,
        tabBarActiveTintColor: colors.brand600,
        tabBarInactiveTintColor: colors.gray500,
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('brand'), tabBarLabel: t('tabHome'), tabBarIcon: icon('home-outline', 'home') }} />
      <Tabs.Screen
        name="book"
        options={{
          title: t('bookABus'),
          tabBarLabel: t('bookABus'),
          tabBarIcon: icon('bus-outline', 'bus'),
        }}
      />
      <Tabs.Screen name="support" options={{ title: t('help'), tabBarLabel: t('tabHelp'), tabBarIcon: icon('help-circle-outline', 'help-circle') }} />
      <Tabs.Screen name="settings" options={{ headerShown: false, title: t('settings'), tabBarLabel: t('tabSettings'), tabBarIcon: icon('settings-outline', 'settings') }} />
      <Tabs.Screen name="bookings" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
    </Tabs>
  );
}
