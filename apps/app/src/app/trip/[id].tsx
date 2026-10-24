import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Linking, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LoginPrompt } from '@/components/LoginPrompt';
import { SeatMap } from '@/components/SeatMap';
import { Button, Card, Eyebrow, Heading, Notice, Row, Screen, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatDate, formatINR, formatTime } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { colors, radius } from '@/lib/theme';
import { CreateBookingResponseSchema, CreateBookingSchema, type CreateBookingResponse } from '@rajveer/shared';
import type { SeatState, TripDetail } from '@/lib/types';

const MAX_SEATS = 6; // same cap the booking API enforces
const EMPTY_SEATS: SeatState[] = [];

export default function TripScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useT();
  const { user, canBook } = useAuth();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  const trip = useQuery({ queryKey: ['trip', id], queryFn: () => api<TripDetail>(`/api/trips/${id}`) });
  const seatQuery = useQuery({
    queryKey: ['seats', id],
    queryFn: () => api<{ seats: SeatState[] }>(`/api/seats/status?tripId=${id}`),
    refetchInterval: 15_000, // same 15s polling as the website
  });
  const seats = seatQuery.data?.seats ?? EMPTY_SEATS;

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const selected = seats.length
    ? selectedIds.filter((sid) => seats.some((seat) => seat.seatTemplateId === sid && seat.status === 'AVAILABLE'))
    : selectedIds;
  const [error, setError] = useState('');
  const [result, setResult] = useState<CreateBookingResponse | null>(null);

  const book = useMutation({
    mutationFn: () => api('/api/bookings', {
      method: 'POST',
      body: CreateBookingSchema.parse({ tripId: id, seatTemplateIds: selected }),
      schema: CreateBookingResponseSchema,
    }),
    onSuccess: (data) => {
      setResult(data);
      setSelectedIds([]);
      void queryClient.invalidateQueries({ queryKey: ['bookings'] });
      void queryClient.invalidateQueries({ queryKey: ['seats', id] });
    },
    onError: (e: Error) => {
      setError(e.message);
      void queryClient.invalidateQueries({ queryKey: ['seats', id] });
    },
  });

  const toggle = (seat: SeatState) => {
    setError('');
    setSelectedIds((cur) => {
      if (cur.includes(seat.seatTemplateId)) return cur.filter((x) => x !== seat.seatTemplateId);
      if (cur.length >= MAX_SEATS) {
        setError(t('maxSeats'));
        return cur;
      }
      return [...cur, seat.seatTemplateId];
    });
  };

  if (trip.isLoading) return <Spinner />;
  if (trip.isError || !trip.data) {
    return (
      <Screen>
        <Notice tone="error">{trip.error instanceof Error ? trip.error.message : t('tripNotFound')}</Notice>
      </Screen>
    );
  }

  const data = trip.data;
  const fare = Number(data.fare);
  const names = selected.map((sid) => seats.find((x) => x.seatTemplateId === sid)?.seatNumber).filter(Boolean) as string[];

  const footer =
    selected.length > 0 && !result ? (
      <View style={{ backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.gray200, padding: 16, paddingBottom: 16 + insets.bottom, gap: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.gray500, fontSize: 13 }}>{names.join(', ')} · {formatINR(fare)} × {selected.length}</Text>
            <Text style={{ color: colors.gray950, fontSize: 13 }}>{t('total')}</Text>
          </View>
          <Text style={{ fontSize: 26, fontWeight: '800', color: colors.brand700 }}>{formatINR(fare * selected.length)}</Text>
        </View>
        <Button title={book.isPending ? t('booking') : t('bookTicket')} loading={book.isPending} onPress={() => { setError(''); book.mutate(); }} />
      </View>
    ) : null;

  return (
    <Screen footer={footer} refreshing={seatQuery.isRefetching} onRefresh={() => { void seatQuery.refetch(); void trip.refetch(); }}>
      <View style={{ backgroundColor: colors.gray950, borderRadius: radius.lg, padding: 20, gap: 8 }}>
        <Eyebrow light>{t('tripTitle')}</Eyebrow>
        <Text style={{ color: colors.white, fontSize: 22, fontWeight: '700' }}>{data.bus.operator} · {data.bus.busNumber}</Text>
        <Text style={{ color: colors.gray300, fontSize: 17 }}>{data.route.source} <Text style={{ color: colors.orange300 }}>→</Text> {data.route.destination}</Text>
        <Text style={{ color: colors.gray300 }}>{formatDate(data.departureTime)} · {formatTime(data.departureTime)} – {formatTime(data.arrivalTime)}</Text>
        <Text style={{ color: colors.gray300 }}>{formatINR(fare)} {t('perSeat')}{seats.length ? ` · ${seats.length} ${t('seatsCount')}` : ''}</Text>
        {data.bus.description ? (
          <Text style={{ color: colors.gray300, backgroundColor: colors.gray900, borderRadius: radius.sm, padding: 10, marginTop: 4 }}>{data.bus.description}</Text>
        ) : null}
      </View>

      {!user ? (
        <LoginPrompt title={t('loginRequired')} subtitle={t('loginRequiredSub')} />
      ) : !canBook ? (
        <Card style={{ gap: 12 }}>
          <Heading>{t('verifyRequired')}</Heading>
          <Text style={{ color: colors.gray500, lineHeight: 20 }}>{t('verifyRequiredSub')}</Text>
          <Button title={t('verifyToBook')} onPress={() => router.push('/settings/profile')} />
        </Card>
      ) : result ? (
        <Card style={{ backgroundColor: colors.green50, borderColor: colors.green200, gap: 12 }}>
          <Text style={{ color: colors.green700, fontWeight: '700', letterSpacing: 1.5, fontSize: 12, textTransform: 'uppercase' }}>{t('bookingConfirmed')}</Text>
          <Text style={{ color: colors.green900, fontSize: 22, fontWeight: '700' }}>{t('ticketBooked')}</Text>
          <Text style={{ color: colors.green900 }}>{t('ownerCallSoon')}</Text>
          <Card style={{ gap: 10 }}>
            <Row label={t('bookingId')} value={result.bookingId} />
            <Row label={t('seatsLabel')} value={result.seats.seatNumbers?.join(', ') ?? '-'} />
            <Row label={t('busOwner')} value={result.ownerName} />
            <Row label={t('ownerPhone')} value={result.ownerPhone ?? t('ownerWillContact')} />
            <Row label={t('totalFare')} value={formatINR(result.total)} />
          </Card>
          {result.ownerPhone ? <Button title={t('callOwner')} onPress={() => void Linking.openURL(`tel:${result.ownerPhone}`)} /> : null}
          <Button title={t('viewBookings')} variant="outline" onPress={() => router.replace('/settings/bookings?view=tickets')} />
        </Card>
      ) : (
        <Card style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Heading style={{ fontSize: 20 }}>{t('selectYourSeats')}</Heading>
            <Text style={{ color: colors.gray500, fontSize: 13 }}>{selected.length ? `${selected.length} ${t('selectedCount')}` : t('tapSeat')}</Text>
          </View>
          {seatQuery.isLoading ? (
            <Spinner />
          ) : seats.length === 0 ? (
            <Notice tone="info">{t('layoutUnavailable')}</Notice>
          ) : (
            <SeatMap seats={seats} selected={selected} onToggle={toggle} />
          )}
          {error ? <Notice tone="error">{error}</Notice> : null}
        </Card>
      )}
    </Screen>
  );
}

