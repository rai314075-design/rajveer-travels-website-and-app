import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Linking, Pressable, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LoginPrompt } from '@/components/LoginPrompt';
import { Badge, Button, Card, Chip, Field, Heading, Notice, Screen, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatDateTime, formatINR, seatNumbers } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { colors } from '@/lib/theme';
import { BookingListSchema, type Booking } from '@rajveer/shared';

export default function Bookings() {
  const t = useT();
  const { view } = useLocalSearchParams<{ view?: string }>();
  const showingHistory = view === 'history';
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['bookings'], queryFn: () => api('/api/bookings', { schema: BookingListSchema }), enabled: Boolean(user) });

  const [cancelId, setCancelId] = useState<string | null>(null);
  const [upiId, setUpiId] = useState('');
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const cancel = useMutation({
    mutationFn: (vars: { id: string; upiId: string }) =>
      api(`/api/bookings/${vars.id}/cancel`, { method: 'POST', body: { upiId: vars.upiId.trim() } }),
    onSuccess: () => {
      setMessage({ tone: 'success', text: t('cancelSent') });
      setCancelId(null);
      setUpiId('');
    },
    onError: (e: Error) => setMessage({ tone: 'error', text: e.message }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api(`/api/bookings/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      setMessage(null);
      void queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
    onError: (e: Error) => setMessage({ tone: 'error', text: e.message }),
  });

  if (!user) {
    return (
      <Screen>
        <LoginPrompt />
      </Screen>
    );
  }

  const bookings = query.data ?? [];
  const visibleBookings = bookings.filter((booking) => {
    const upcoming = ['PENDING', 'CONFIRMED'].includes(booking.status) && new Date(booking.trip.departureTime).getTime() >= query.dataUpdatedAt;
    return showingHistory ? !upcoming : upcoming;
  });

  const confirmDelete = (b: Booking) => {
    const unpaidActive = ['PENDING', 'CONFIRMED'].includes(b.status) && b.payment?.status !== 'PAID';
    Alert.alert(t('bookingHistory'), unpaidActive ? t('confirmUnpaid') : t('confirmDelete'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('remove'), style: 'destructive', onPress: () => remove.mutate(b.id) },
    ]);
  };

  return (
    <Screen refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
      <Heading>{showingHistory ? t('bookingHistory') : t('bookedTickets')}</Heading>
      <Text style={{ color: colors.gray500 }}>{t('bookingsSub')}</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Chip label={t('bookedTickets')} selected={!showingHistory} onPress={() => router.replace('/settings/bookings?view=tickets')} />
        <Chip label={t('bookingHistory')} selected={showingHistory} onPress={() => router.replace('/settings/bookings?view=history')} />
      </View>
      {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}
      {query.isLoading ? <Spinner /> : null}
      {query.isError ? <Notice tone="error">{query.error instanceof Error ? query.error.message : t('error')}</Notice> : null}
      {query.isSuccess && visibleBookings.length === 0 ? (
        <Card style={{ alignItems: 'center', padding: 32 }}><Text style={{ color: colors.gray500 }}>{showingHistory ? t('noBookings') : t('noBookedTickets')}</Text></Card>
      ) : null}

      {visibleBookings.map((b) => {
        const canCancel = ['CONFIRMED', 'PENDING'].includes(b.status);
        const canDelete = ['CANCELLED', 'REFUNDED'].includes(b.status) || (b.status === 'PENDING' && b.payment?.status !== 'PAID');
        const phone = b.trip.bus.ownerPhone;
        return (
          <Card key={b.id} style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <Text style={{ flex: 1, fontWeight: '700', fontSize: 16, color: colors.gray950 }}>
                {b.trip.route.source} <Text style={{ color: colors.gray400, fontWeight: '400' }}>â†’</Text> {b.trip.route.destination}
              </Text>
              <Badge label={b.status} tone={b.status === 'CONFIRMED' ? 'green' : b.status === 'REFUNDED' ? 'blue' : 'gray'} />
            </View>
            <Text style={{ color: colors.gray500 }}>{b.trip.bus.busNumber} Â· {formatDateTime(b.trip.departureTime)}</Text>
            <Text style={{ color: colors.gray500 }}>{t('seatsLabel')}: {seatNumbers(b.passengerInfo)} Â· {formatINR(b.totalAmount)}</Text>
            <Pressable disabled={!phone} onPress={() => phone && void Linking.openURL(`tel:${phone}`)}>
              <Text style={{ color: colors.gray600 }}>
                {t('busOwner')}: <Text style={{ color: phone ? colors.brand700 : colors.gray500, fontWeight: '600' }}>{phone ?? t('phoneNA')}</Text>
              </Text>
            </Pressable>

            <View style={{ gap: 8, marginTop: 8 }}>
              {canCancel ? <Button small variant="amber" title={t('requestCancel')} onPress={() => { setCancelId(b.id); setMessage(null); }} /> : null}
              {canDelete ? <Button small variant="danger" title={b.status === 'PENDING' ? t('cancelDelete') : t('deleteHistory')} disabled={remove.isPending} onPress={() => confirmDelete(b)} /> : null}
              <Button small variant="outline" title={t('reportIssue')} onPress={() => router.push({ pathname: '/support', params: { bookingId: b.id } })} />
            </View>

            {cancelId === b.id ? (
              <View style={{ backgroundColor: colors.amber50, borderColor: colors.amber200, borderWidth: 1, borderRadius: 12, padding: 12, gap: 10, marginTop: 8 }}>
                <Text style={{ fontWeight: '700', color: colors.amber900 }}>{t('upiTitle')}</Text>
                <Text style={{ color: colors.amber900 }}>{t('upiSub')}</Text>
                <Field label="UPI ID" value={upiId} onChangeText={setUpiId} placeholder="name@upi" autoCapitalize="none" autoCorrect={false} />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1 }}><Button small title={t('submit')} loading={cancel.isPending} disabled={upiId.trim().length < 3} onPress={() => cancel.mutate({ id: b.id, upiId })} /></View>
                  <View style={{ flex: 1 }}><Button small variant="outline" title={t('close')} onPress={() => setCancelId(null)} /></View>
                </View>
              </View>
            ) : null}
          </Card>
        );
      })}
      <Text style={{ backgroundColor: colors.gray100, color: colors.gray500, fontSize: 12, padding: 12, borderRadius: 8 }}>{t('cancelHint')}</Text>
    </Screen>
  );
}

