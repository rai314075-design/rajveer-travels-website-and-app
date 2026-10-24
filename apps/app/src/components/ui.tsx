import { ReactNode } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, StyleProp,
  StyleSheet, Text, TextInput, TextInputProps, TextStyle, View, ViewStyle,
} from 'react-native';
import { colors, radius } from '@/lib/theme';

export function Screen({
  children, refreshing, onRefresh, footer, dark,
}: {
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  footer?: ReactNode;
  dark?: boolean;
}) {
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: dark ? colors.gray950 : colors.gray50 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={onRefresh ? <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={colors.brand600} /> : undefined}
      >
        {children}
      </ScrollView>
      {footer}
    </KeyboardAvoidingView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function Eyebrow({ children, light }: { children: ReactNode; light?: boolean }) {
  return <Text style={[s.eyebrow, { color: light ? colors.orange300 : colors.brand600 }]}>{children}</Text>;
}

export function Heading({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[s.heading, style]}>{children}</Text>;
}

type Variant = 'primary' | 'outline' | 'danger' | 'amber';

export function Button({
  title, onPress, loading, disabled, variant = 'primary', small,
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: Variant;
  small?: boolean;
}) {
  const off = disabled || loading;
  const bg = variant === 'primary' ? colors.brand600 : variant === 'amber' ? colors.amber500 : colors.white;
  const border = variant === 'danger' ? colors.red200 : variant === 'outline' ? colors.gray300 : 'transparent';
  const fg = variant === 'primary' || variant === 'amber' ? colors.white : variant === 'danger' ? colors.red700 : colors.gray900;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      style={({ pressed }) => [
        s.btn, small && s.btnSmall,
        { backgroundColor: bg, borderColor: border, opacity: off ? 0.5 : pressed ? 0.85 : 1 },
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : <Text style={[s.btnText, small && { fontSize: 14 }, { color: fg }]}>{title}</Text>}
    </Pressable>
  );
}

export function Field({ label, error, style, ...props }: TextInputProps & { label: string; error?: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.gray400}
        style={[s.input, props.multiline && { minHeight: 100, textAlignVertical: 'top' }, error ? { borderColor: colors.red600 } : null, style]}
        {...props}
      />
      {error ? <Text style={s.errorText}>{error}</Text> : null}
    </View>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[s.chip, selected && { backgroundColor: colors.brand600, borderColor: colors.brand600 }]}>
      <Text style={[s.chipText, selected && { color: colors.white }]}>{label}</Text>
    </Pressable>
  );
}

export function Badge({ label, tone = 'gray' }: { label: string; tone?: 'gray' | 'green' | 'blue' | 'brand' }) {
  const map = {
    gray: [colors.gray100, colors.gray600],
    green: [colors.green50, colors.green700],
    blue: [colors.blue50, colors.blue700],
    brand: [colors.brand50, colors.brand700],
  } as const;
  const [bg, fg] = map[tone];
  return (
    <View style={{ backgroundColor: bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, alignSelf: 'flex-start' }}>
      <Text style={{ color: fg, fontSize: 12, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

export function Notice({ children, tone }: { children: ReactNode; tone: 'error' | 'success' | 'warn' | 'info' }) {
  const map = {
    error: [colors.red50, colors.red200, colors.red700],
    success: [colors.green50, colors.green200, colors.green900],
    warn: [colors.amber50, colors.amber200, colors.amber900],
    info: [colors.gray100, colors.gray200, colors.gray700],
  } as const;
  const [bg, border, fg] = map[tone];
  return (
    <View style={{ backgroundColor: bg, borderColor: border, borderWidth: 1, borderRadius: radius.md, padding: 12 }}>
      <Text style={{ color: fg, fontSize: 14, lineHeight: 20 }}>{children}</Text>
    </View>
  );
}

export function Centered({ children }: { children: ReactNode }) {
  return <View style={{ alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 }}>{children}</View>;
}

export function Spinner() {
  return <ActivityIndicator size="large" color={colors.brand600} style={{ marginVertical: 32 }} />;
}

export function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <View style={{ gap: 2 }}>
      <Text style={{ color: colors.gray500, fontSize: 13 }}>{label}</Text>
      {typeof value === 'string' ? <Text style={{ color: colors.gray950, fontWeight: '600', fontSize: 15 }}>{value}</Text> : value}
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.gray200, padding: 16, gap: 8 },
  eyebrow: { fontSize: 12, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase' },
  heading: { fontSize: 24, fontWeight: '700', color: colors.gray950 },
  btn: { minHeight: 48, borderRadius: radius.sm, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  btnSmall: { minHeight: 40, paddingHorizontal: 12 },
  btnText: { fontSize: 16, fontWeight: '600' },
  label: { fontSize: 14, fontWeight: '600', color: colors.gray700 },
  input: { borderWidth: 1, borderColor: colors.gray300, borderRadius: radius.sm, backgroundColor: colors.white, paddingHorizontal: 12, paddingVertical: 12, fontSize: 16, color: colors.gray950 },
  errorText: { color: colors.red600, fontSize: 13 },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: colors.gray300, backgroundColor: colors.white },
  chipText: { fontSize: 14, fontWeight: '600', color: colors.gray700 },
});
