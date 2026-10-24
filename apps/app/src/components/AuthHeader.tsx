import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Heading } from '@/components/ui';
import { colors, radius } from '@/lib/theme';

export function AuthHeader({ title, subtitle, brand, action }: { title: string; subtitle: string; brand: string; action: string }) {
  return (
    <View style={{ backgroundColor: colors.gray950, borderRadius: 22, padding: 20, gap: 20, overflow: 'hidden' }}>
      <View style={{ position: 'absolute', right: -36, top: -46, width: 150, height: 150, borderRadius: 80, borderWidth: 1, borderColor: '#1f2937' }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
        <View style={{ width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.brand600, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="bus-outline" size={24} color={colors.white} />
        </View>
        <View style={{ gap: 3 }}>
          <Text style={{ color: colors.white, fontSize: 15, fontWeight: '700' }}>{brand}</Text>
          <Text style={{ color: colors.gray400, fontSize: 12 }}>{action}</Text>
        </View>
      </View>

      <View style={{ gap: 7 }}>
        <Heading style={{ color: colors.white, fontSize: 28, lineHeight: 34 }}>{title}</Heading>
        <Text style={{ color: colors.gray300, fontSize: 14, lineHeight: 21 }}>{subtitle}</Text>
      </View>
    </View>
  );
}
