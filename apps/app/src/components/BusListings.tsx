import { router, useLocalSearchParams } from 'expo-router';
import { FlatList, Image, RefreshControl, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Badge, Button, Card, Notice, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatINR, formatTime } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { colors } from '@/lib/theme';
import type { TripSummary } from '@/lib/types';

export function BusListings() {
  const t = useT();
  const { user, canBook } = useAuth();
  const { source = '', destination = '', date = '' } = useLocalSearchParams<{ source?: string; destination?: string; date?: string }>();

  const query = useQuery({
    queryKey: ['trips', source, destination, date],
    queryFn: () => {
      const qs = new URLSearchParams();
      if (source) qs.set('source', source);
      if (destination) qs.set('destination', destination);
      if (date) qs.set('date', date);
      return api<{ trips: TripSummary[] }>(`/api/trips/search?${qs.toString()}`);
    },
    refetchInterval: 30_000,
    refetchOnMount: 'always',
  });
  const trips = query.data?.trips ?? [];

  const action = (tripId: string) => {
    if (canBook) router.push(`/trip/${tripId}`);
    else if (user) router.push('/settings/profile');
    else router.push('/login');
  };
  const actionLabel = canBook ? t('selectSeats') : user ? t('verifyToBook') : t('loginToBook');

  return (
    <FlatList
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 16, gap: 12 }}
      data={trips}
      keyExtractor={(trip) => trip.id}
      refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor={colors.brand600} />}
      ListHeaderComponent={
        <View style={{ gap: 12, marginBottom: 4 }}>
          {!canBook && <Notice tone="warn">{t('bookNotice')}</Notice>}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: colors.gray700, fontWeight: '600', flex: 1 }}>
              {source && destination ? `${source} → ${destination}${date ? ` · ${date}` : ''}` : t('searchTitle')}
            </Text>
            {query.data && <Text style={{ color: colors.gray500 }}>{trips.length} {trips.length === 1 ? t('result') : t('results')}</Text>}
          </View>
        </View>
      }
      ListEmptyComponent={
        query.isLoading ? <Spinner /> : query.isError ? (
          <Notice tone="error">{query.error instanceof Error ? query.error.message : t('error')}</Notice>
        ) : (
          <Card style={{ alignItems: 'center', padding: 32 }}><Text style={{ color: colors.gray500, textAlign: 'center' }}>{t('noBuses')}</Text></Card>
        )
      }
      renderItem={({ item: trip }) => (
        <Card style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={{ fontWeight: '700', fontSize: 16, color: colors.gray950 }}>{trip.bus.operator} · {trip.bus.busNumber}</Text>
              <Badge tone="brand" label={trip.bus.type.replace(/_/g, ' ')} />
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 12, color: colors.gray500 }}>{t('startingFrom')}</Text>
              <Text style={{ fontSize: 24, fontWeight: '800', color: colors.brand700 }}>{formatINR(trip.fare)}</Text>
            </View>
          </View>
          {trip.bus.description ? <Text style={{ color: colors.gray700 }}>{trip.bus.description}</Text> : null}
          <Text style={{ color: colors.gray600 }}>
            {t('departure')} {formatTime(trip.departureTime)} → {t('arrival')} {formatTime(trip.arrivalTime)}
          </Text>
          <Text style={{ color: colors.gray500, fontSize: 12 }}>
            {trip.route.pickupPoint || trip.route.source} → {trip.route.dropPoint || trip.route.destination}
          </Text>
          {trip.bus.upiId ? <Text style={{ color: colors.gray700, fontSize: 12 }}>{t('upi')}: {trip.bus.upiId}</Text> : null}
          {trip.bus.paymentQrUrl ? <Image source={{ uri: trip.bus.paymentQrUrl }} style={{ width: 64, height: 64, borderRadius: 6 }} /> : null}
          <Button title={actionLabel} onPress={() => action(trip.id)} />
        </Card>
      )}
    />
  );
}
