import { useState } from 'react';
import { Pressable, Text, TextInput, TextInputProps, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useT } from '@/lib/i18n';
import { colors, radius } from '@/lib/theme';

export function PasswordField({ label, ...props }: TextInputProps & { label: string }) {
  const t = useT();
  const [visible, setVisible] = useState(false);

  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.gray700 }}>{label}</Text>
      <View style={{ minHeight: 50, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.gray300, borderRadius: radius.sm, backgroundColor: colors.white }}>
        <TextInput
          {...props}
          secureTextEntry={!visible}
          placeholderTextColor={colors.gray400}
          style={[{ flex: 1, paddingHorizontal: 12, paddingVertical: 12, fontSize: 16, color: colors.gray950 }, props.style]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={visible ? t('hidePassword') : t('showPassword')}
          onPress={() => setVisible((current) => !current)}
          hitSlop={8}
          style={{ minWidth: 46, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.gray500} />
        </Pressable>
      </View>
    </View>
  );
}
