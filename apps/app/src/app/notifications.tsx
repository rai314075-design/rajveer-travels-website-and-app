import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LoginPrompt } from '@/components/LoginPrompt';
import { Button, Notice, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatDateTime } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { colors } from '@/lib/theme';
import type { Notice as NoticeItem } from '@/lib/types';

export default function Notifications() {
  const t = useT();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api<{ notifications: NoticeItem[]; unread: number }>('/api/notifications'),
    enabled: Boolean(user),
  });
  const markRead = useMutation({
    mutationFn: (body: { id: string } | { all: true }) => api('/api/notifications', { method: 'PATCH', body }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  if (!user) return <View style={{ padding: 16 }}><LoginPrompt /></View>;

  const items = query.data?.notifications ?? [];
  const unread = query.data?.unread ?? 0;

  return (
    <FlatList
      data={items}
      keyExtractor={(n) => n._id}
      contentContainerStyle={{ padding: 16, gap: 8 }}
      refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor={colors.brand600} />}
      ListHeaderComponent={
        <View style={{ marginBottom: 8, gap: 8 }}>
          <Text style={{ color: colors.gray500 }}>{unread ? `${unread} ${t('unread')}` : t('allCaughtUp')}</Text>
          {unread > 0 ? <Button small variant="outline" title={t('markAllRead')} onPress={() => markRead.mutate({ all: true })} /> : null}
        </View>
      }
      ListEmptyComponent={
        query.isLoading ? <Spinner /> : query.isError ? (
          <Notice tone="error">{query.error instanceof Error ? query.error.message : t('error')}</Notice>
        ) : (
          <Text style={{ textAlign: 'center', color: colors.gray500, padding: 32 }}>{t('noNotifications')}</Text>
        )
      }
      renderItem={({ item }) => (
        <Pressable
          onPress={() => !item.read && markRead.mutate({ id: item._id })}
          style={{
            backgroundColor: item.read ? colors.white : colors.brand50, borderRadius: 12, padding: 14, gap: 4,
            borderWidth: 1, borderColor: colors.gray200, borderLeftWidth: item.read ? 1 : 4, borderLeftColor: item.read ? colors.gray200 : colors.brand600,
          }}
        >
          <Text style={{ color: item.read ? colors.gray500 : colors.gray950, fontWeight: item.read ? '400' : '600', lineHeight: 20 }}>{item.message}</Text>
          <Text style={{ color: colors.gray400, fontSize: 12 }}>{formatDateTime(item.createdAt)}</Text>
        </Pressable>
      )}
    />
  );
}
