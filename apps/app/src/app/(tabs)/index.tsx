import { useState } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Card, Eyebrow, Notice } from '@/components/ui';
import { api } from '@/lib/api';
import { nextDays } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { colors, radius } from '@/lib/theme';
import { RouteListResponseSchema, type RouteSummary } from '@rajveer/shared';

export default function Home() {
  const t = useT();
  const days = nextDays(14);
  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState(days[0].iso);
  const [error, setError] = useState('');
  const routesQuery = useQuery({
    queryKey: ['routes'],
    queryFn: () => api<{ routes: RouteSummary[] }>('/api/routes', { schema: RouteListResponseSchema }),
    refetchInterval: 60_000,
    refetchOnMount: 'always',
  });

  const routes = routesQuery.data?.routes ?? [];
  const go = (from: string, to: string, when: string) =>
    router.push({ pathname: '/search', params: { source: from.trim(), destination: to.trim(), date: when } });

  const submit = () => {
    if (!source.trim() || !destination.trim()) {
      setError(t('enterCities'));
      return;
    }
    setError('');
    go(source, destination, date);
  };

  const swapCities = () => {
    setSource(destination);
    setDestination(source);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.gray50 }}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: 36 }}
    >
      <View style={{ backgroundColor: colors.gray950, paddingHorizontal: 20, paddingTop: 22, paddingBottom: 48, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', right: -34, top: 15, width: 174, height: 174, borderRadius: 100, borderWidth: 1, borderColor: '#1f2937' }} />
        <View style={{ position: 'absolute', right: 0, top: 49, width: 106, height: 106, borderRadius: 60, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="bus-outline" size={48} color={colors.orange300} />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: colors.brand600, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="navigate" size={20} color={colors.white} />
          </View>
          <View style={{ gap: 2 }}>
            <Text style={{ color: colors.white, fontSize: 15, fontWeight: '700' }}>{t('brand')}</Text>
            <Text style={{ color: colors.gray400, fontSize: 12 }}>{t('planTrip')}</Text>
          </View>
        </View>

        <View style={{ maxWidth: '78%', gap: 8 }}>
          <Eyebrow light>{t('popular')}</Eyebrow>
          <Text style={{ color: colors.white, fontSize: 30, fontWeight: '800', lineHeight: 36 }}>{t('heroTitle')}</Text>
          <Text style={{ color: colors.gray300, fontSize: 14, lineHeight: 21 }}>{t('heroSub')}</Text>
        </View>

        {routesQuery.isSuccess ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 18 }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#4ade80' }} />
            <Text style={{ color: colors.gray300, fontSize: 13 }}>
              {routes.length} {t('statRoutes')}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={{ paddingHorizontal: 16, marginTop: -28 }}>
        <Card style={{ padding: 18, gap: 18, borderColor: colors.gray200, shadowColor: colors.gray950, shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 3 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Eyebrow>{t('planTrip')}</Eyebrow>
              <Text style={{ fontSize: 20, fontWeight: '800', color: colors.gray950 }}>{t('whereGoing')}</Text>
              <Text style={{ fontSize: 13, lineHeight: 19, color: colors.gray500 }}>{t('searchSub')}</Text>
            </View>
            <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: colors.brand50, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="ticket-outline" size={22} color={colors.brand600} />
            </View>
          </View>

          <View style={{ borderWidth: 1, borderColor: colors.gray200, borderRadius: radius.md, backgroundColor: colors.white, overflow: 'hidden' }}>
            <View style={{ minHeight: 62, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 12 }}>
              <Ionicons name="radio-button-on" size={18} color={colors.brand600} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.gray500, fontSize: 11, fontWeight: '700', letterSpacing: 0.6 }}>{t('from').toUpperCase()}</Text>
                <TextInput
                  accessibilityLabel={t('from')}
                  value={source}
                  onChangeText={(value) => { setSource(value); setError(''); }}
                  placeholder={t('fromPh')}
                  placeholderTextColor={colors.gray400}
                  autoCapitalize="words"
                  returnKeyType="next"
                  style={{ color: colors.gray950, fontSize: 16, paddingVertical: 4 }}
                />
              </View>
            </View>

            <View style={{ height: 1, backgroundColor: colors.gray200, marginLeft: 44, marginRight: 14 }} />

            <View style={{ minHeight: 62, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 12 }}>
              <Ionicons name="location-outline" size={20} color={colors.gray500} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.gray500, fontSize: 11, fontWeight: '700', letterSpacing: 0.6 }}>{t('to').toUpperCase()}</Text>
                <TextInput
                  accessibilityLabel={t('to')}
                  value={destination}
                  onChangeText={(value) => { setDestination(value); setError(''); }}
                  placeholder={t('toPh')}
                  placeholderTextColor={colors.gray400}
                  autoCapitalize="words"
                  returnKeyType="search"
                  onSubmitEditing={submit}
                  style={{ color: colors.gray950, fontSize: 16, paddingVertical: 4 }}
                />
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Swap departure and arrival cities"
                onPress={swapCities}
                style={({ pressed }) => ({ width: 38, height: 38, borderRadius: 12, backgroundColor: colors.brand50, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}
              >
                <Ionicons name="swap-vertical" size={20} color={colors.brand700} />
              </Pressable>
            </View>
          </View>

          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
              <Ionicons name="calendar-outline" size={17} color={colors.gray600} />
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.gray700 }}>{t('travelDate')}</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {days.map((day) => {
                const selected = day.iso === date;
                return (
                  <Pressable
                    key={day.iso}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => setDate(day.iso)}
                    style={{ minWidth: 68, paddingHorizontal: 10, paddingVertical: 9, alignItems: 'center', borderRadius: radius.md, borderWidth: 1, borderColor: selected ? colors.brand600 : colors.gray200, backgroundColor: selected ? colors.brand600 : colors.white }}
                  >
                    <Text style={{ fontSize: 11, color: selected ? colors.brand100 : colors.gray500 }}>{day.day}</Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: selected ? colors.white : colors.gray900 }}>{day.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {error ? <Notice tone="error">{error}</Notice> : null}
          <Pressable
            accessibilityRole="button"
            onPress={submit}
            style={({ pressed }) => ({ minHeight: 52, backgroundColor: colors.brand600, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, opacity: pressed ? 0.86 : 1 })}
          >
            <Ionicons name="search-outline" size={19} color={colors.white} />
            <Text style={{ color: colors.white, fontWeight: '700', fontSize: 16 }}>{t('searchBuses')}</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.white} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('bookABus')}
            onPress={() => router.push('/search')}
            style={({ pressed }) => ({ minHeight: 50, backgroundColor: colors.white, borderColor: colors.brand600, borderWidth: 1, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, opacity: pressed ? 0.75 : 1 })}
          >
            <Ionicons name="bus-outline" size={19} color={colors.brand700} />
            <Text style={{ color: colors.brand700, fontWeight: '700', fontSize: 15 }}>{t('bookABus')}</Text>
            <Ionicons name="arrow-forward" size={17} color={colors.brand700} />
          </Pressable>
        </Card>
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 28, gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
          <View style={{ gap: 4, flex: 1 }}>
            <Eyebrow>{t('popular')}</Eyebrow>
            <Text style={{ fontSize: 20, lineHeight: 26, fontWeight: '800', color: colors.gray950 }}>{t('familiar')}</Text>
          </View>
          {routesQuery.isSuccess ? (
            <View style={{ backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray200, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 }}>
              <Text style={{ color: colors.gray600, fontSize: 12, fontWeight: '700' }}>{routes.length}</Text>
            </View>
          ) : null}
        </View>

        {routesQuery.isLoading ? (
          <Card style={{ minHeight: 90, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <ActivityIndicator color={colors.brand600} />
            <Text style={{ color: colors.gray500 }}>{t('loading')}</Text>
          </Card>
        ) : null}
        {routesQuery.isError ? <Notice tone="info">{t('routeLoadError')}</Notice> : null}
        {routesQuery.isSuccess && routes.length === 0 ? <Notice tone="info">{t('noRoutes')}</Notice> : null}

        {routes.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 16 }}>
            {routes.map((route) => (
              <Pressable key={route.id} onPress={() => go(route.source, route.destination, date)}>
                <Card style={{ width: 255, minHeight: 132, justifyContent: 'space-between', padding: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <View style={{ flex: 1, gap: 5 }}>
                      <Text numberOfLines={1} style={{ fontSize: 16, fontWeight: '800', color: colors.gray950 }}>{route.source}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={{ height: 1, width: 18, backgroundColor: colors.gray400 }} />
                        <Ionicons name="bus-outline" size={14} color={colors.brand600} />
                        <View style={{ height: 1, width: 18, backgroundColor: colors.gray400 }} />
                      </View>
                      <Text numberOfLines={1} style={{ fontSize: 16, fontWeight: '800', color: colors.gray950 }}>{route.destination}</Text>
                    </View>
                    <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: colors.brand50, alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="arrow-forward" size={19} color={colors.brand700} />
                    </View>
                  </View>
                  <Text style={{ color: colors.brand700, fontWeight: '700', fontSize: 13 }}>{t('viewBuses')}  ›</Text>
                </Card>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 28, gap: 12 }}>
        <View style={{ gap: 4 }}>
          <Eyebrow>{t('brand')}</Eyebrow>
          <Text style={{ fontSize: 20, fontWeight: '800', color: colors.gray950 }}>{t('bookABus')}</Text>
        </View>
        {([
          ['grid-outline', 'feat1T', 'feat1D'],
          ['checkmark-circle-outline', 'feat2T', 'feat2D'],
          ['headset-outline', 'feat3T', 'feat3D'],
        ] as const).map(([icon, title, description]) => (
          <View key={title} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray200, borderRadius: radius.md, padding: 14 }}>
            <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: colors.brand50, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={icon} size={20} color={colors.brand600} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={{ fontWeight: '700', fontSize: 15, color: colors.gray950 }}>{t(title)}</Text>
              <Text style={{ color: colors.gray500, lineHeight: 19, fontSize: 13 }}>{t(description)}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
