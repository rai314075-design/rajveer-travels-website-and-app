import { useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { LoginPrompt } from '@/components/LoginPrompt';
import { Button, Card, Chip, Field, Heading, Notice, Screen } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { TKey, useT } from '@/lib/i18n';
import { colors } from '@/lib/theme';

const CATEGORIES = ['BUS', 'SERVICE', 'DRIVER', 'PAYMENT', 'OTHER'] as const;

export default function Support() {
  const t = useT();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ bookingId?: string }>();
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('SERVICE');
  const [message, setMessage] = useState('');
  const [bookingId, setBookingId] = useState(() => params.bookingId ?? '');
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const send = useMutation({
    mutationFn: () =>
      api('/api/support/complaints', {
        method: 'POST',
        body: { category, message: message.trim(), bookingId: bookingId.trim() || undefined },
      }),
    onSuccess: () => {
      setNotice({ tone: 'success', text: t('complaintSent') });
      setMessage('');
    },
    onError: (e: Error) => setNotice({ tone: 'error', text: e.message }),
  });

  if (!user) {
    return (
      <Screen>
        <LoginPrompt />
      </Screen>
    );
  }

  const submit = () => {
    if (message.trim().length < 10) return setNotice({ tone: 'error', text: t('minChars') });
    setNotice(null);
    send.mutate();
  };

  return (
    <Screen>
      <Text style={{ color: colors.gray500 }}>{t('supportSub')}</Text>
      <Card style={{ gap: 16, padding: 18 }}>
        <View style={{ gap: 4 }}>
          <Heading style={{ fontSize: 20 }}>{t('contactSupport')}</Heading>
          <Text style={{ color: colors.gray500 }}>{t('supportHint')}</Text>
        </View>
        <View style={{ gap: 6 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.gray700 }}>{t('issueType')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {CATEGORIES.map((c) => (
              <Chip key={c} label={t(`cat${c}` as TKey)} selected={category === c} onPress={() => setCategory(c)} />
            ))}
          </View>
        </View>
        <Field label={t('bookingIdOpt')} value={bookingId} onChangeText={setBookingId} placeholder={t('bookingIdPh')} autoCapitalize="none" autoCorrect={false} />
        <Field label={t('describe')} value={message} onChangeText={setMessage} placeholder={t('describePh')} multiline maxLength={2000} />
        {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}
        <Button title={send.isPending ? t('sending') : t('sendMessage')} loading={send.isPending} onPress={submit} />
      </Card>
    </Screen>
  );
}
