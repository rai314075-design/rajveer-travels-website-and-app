import { useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { LoginPrompt } from '@/components/LoginPrompt';
import { Badge, Button, Card, Chip, Field, Heading, Notice, Screen } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { API_URL } from '@/lib/config';
import { useT } from '@/lib/i18n';
import { colors } from '@/lib/theme';
import type { Language } from '@/lib/types';

export default function Profile() {
  const t = useT();
  const { user, refresh } = useAuth();

  const [name, setName] = useState(() => user?.name ?? '');
  const [address, setAddress] = useState(() => user?.address ?? '');
  const [language, setLanguage] = useState<Language>(() => user?.language ?? 'ENGLISH');
  const [saving, setSaving] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailCode, setEmailCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);


  if (!user) {
    return (
      <Screen>
        <LoginPrompt />
      </Screen>
    );
  }

  const run = async (fn: () => Promise<void>) => {
    setNotice(null);
    try {
      await fn();
    } catch (e) {
      setNotice({ tone: 'error', text: e instanceof Error ? e.message : t('error') });
    }
  };

  const save = async () => {
    setSaving(true);
    await run(async () => {
      // The phone number is sent back unchanged: changing it needs an SMS code, which the website handles.
      await api('/api/profile', { method: 'PATCH', body: { name: name.trim(), phone: user.phone ?? '', address: address.trim(), language } });
      await refresh();
      setNotice({ tone: 'success', text: t('profileUpdated') });
    });
    setSaving(false);
  };

  const sendEmailCode = async () => {
    setBusy(true);
    await run(async () => {
      await api('/api/profile/email/send', { method: 'POST', body: {} });
      setEmailSent(true);
      setNotice({ tone: 'success', text: t('emailCodeSent') });
    });
    setBusy(false);
  };

  const verifyEmail = async () => {
    setBusy(true);
    await run(async () => {
      await api('/api/profile/email/verify', { method: 'POST', body: { code: emailCode } });
      setEmailSent(false);
      setEmailCode('');
      await refresh();
      setNotice({ tone: 'success', text: t('emailVerifiedMsg') });
    });
    setBusy(false);
  };

  const status = (ok: boolean) => <Badge tone={ok ? 'green' : 'gray'} label={ok ? t('verified') : t('notVerified')} />;

  return (
    <Screen>
      <Card style={{ gap: 4 }}>
        <Heading>{user.name}</Heading>
        <Text style={{ color: colors.gray500 }}>{user.email}</Text>
      </Card>

      {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}

      <Card style={{ gap: 14 }}>
        <Text style={sectionTitle}>{t('verification')}</Text>
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontWeight: '600', color: colors.gray900 }}>{t('email')}</Text>
            {status(user.emailVerified)}
          </View>
          <Text style={{ color: colors.gray500, fontSize: 12 }}>{t('emailFixed')}</Text>
          {!user.emailVerified && !emailSent ? <Button small variant="outline" title={t('sendEmailCode')} loading={busy} onPress={sendEmailCode} /> : null}
          {!user.emailVerified && emailSent ? (
            <View style={{ gap: 8 }}>
              <Field label={t('enterEmailCode')} value={emailCode} onChangeText={(v) => setEmailCode(v.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" maxLength={6} placeholder="123456" />
              <Button small title={t('verifyEmail')} loading={busy} disabled={emailCode.length !== 6} onPress={verifyEmail} />
            </View>
          ) : null}
        </View>
        <View style={{ height: 1, backgroundColor: colors.gray100 }} />
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontWeight: '600', color: colors.gray900 }}>{t('phone')}: {user.phone ?? '—'}</Text>
            {status(user.phoneVerified)}
          </View>
          {!user.phoneVerified ? (
            <>
              <Text style={{ color: colors.gray500, fontSize: 12 }}>{t('phoneWeb')}</Text>
              <Button small variant="outline" title={t('phoneWebBtn')} onPress={() => void Linking.openURL(`${API_URL}/profile`)} />
            </>
          ) : null}
        </View>
      </Card>

      <Card style={{ gap: 14 }}>
        <Text style={sectionTitle}>{t('preferences')}</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Chip label="English" selected={language === 'ENGLISH'} onPress={() => setLanguage('ENGLISH')} />
          <Chip label="हिन्दी" selected={language === 'HINDI'} onPress={() => setLanguage('HINDI')} />
        </View>
        <Text style={sectionTitle}>{t('personalInfo')}</Text>
        <Field label={t('name')} value={name} onChangeText={setName} autoCapitalize="words" />
        <Field label={t('address')} value={address} onChangeText={setAddress} multiline maxLength={500} />
        <Button title={saving ? t('saving') : t('saveProfile')} loading={saving} disabled={!name.trim()} onPress={save} />
      </Card>

    </Screen>
  );
}

const sectionTitle = { fontSize: 12, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', color: colors.gray500 } as const;

