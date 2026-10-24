import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { colors } from '@/lib/theme';
import type { Notice } from '@/lib/types';

export function NotificationBell() {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api<{ notifications: Notice[]; unread: number }>('/api/notifications'),
    enabled: Boolean(user),
    refetchInterval: 60_000,
  });
  if (!user) return null;
  const unread = data?.unread ?? 0;
  return (
    <Pressable onPress={() => router.push('/notifications')} hitSlop={10} style={{ marginRight: 12 }} accessibilityLabel="Notifications">
      <Ionicons name="notifications-outline" size={24} color={colors.white} />
      {unread > 0 && (
        <View style={{ position: 'absolute', top: -4, right: -6, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.red600, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 }}>
          <Text style={{ color: colors.white, fontSize: 10, fontWeight: '700' }}>{unread > 9 ? '9+' : unread}</Text>
        </View>
      )}
    </Pressable>
  );
}
