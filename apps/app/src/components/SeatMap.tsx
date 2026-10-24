import { useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '@/lib/theme';
import { useT } from '@/lib/i18n';
import type { Deck, SeatState } from '@/lib/types';

const PAD = 12;
const GAP = 6;

type Visual = 'available' | 'selected' | 'locked' | 'booked';

function palette(seat: SeatState, v: Visual) {
  if (v === 'selected') return { bg: colors.brand100, border: colors.brand400, fg: colors.brand900 };
  if (v === 'locked') return { bg: colors.yellow100, border: colors.yellow300, fg: colors.yellow800 };
  if (v === 'booked') return { bg: colors.red600, border: colors.red700, fg: colors.white };
  return seat.type === 'SLEEPER'
    ? { bg: colors.amber50, border: colors.amber200, fg: colors.gray900 }
    : { bg: colors.blue50, border: colors.blue200, fg: colors.gray900 };
}

export function SeatLegend() {
  const t = useT();
  const items: { label: string; bg: string; border: string }[] = [
    { label: t('legendSeat'), bg: colors.blue50, border: colors.blue200 },
    { label: t('legendSleeper'), bg: colors.amber50, border: colors.amber200 },
    { label: t('legendSelected'), bg: colors.brand100, border: colors.brand400 },
    { label: t('legendLocked'), bg: colors.yellow100, border: colors.yellow300 },
    { label: t('legendBooked'), bg: colors.red600, border: colors.red700 },
  ];
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
      {items.map((i) => (
        <View key={i.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 18, height: 18, borderRadius: 4, backgroundColor: i.bg, borderWidth: 1, borderColor: i.border }} />
          <Text style={{ fontSize: 12, color: colors.gray700 }}>{i.label}</Text>
        </View>
      ))}
    </View>
  );
}

/**
 * Positions each seat on a grid using the same xPosition/yPosition/colSpan/rowSpan the website
 * uses, scaled to the phone's width. Column 2 is drawn as the aisle, like the web seat map.
 */
export function SeatMap({
  seats, selected, onToggle,
}: {
  seats: SeatState[];
  selected: string[];
  onToggle: (seat: SeatState) => void;
}) {
  const t = useT();
  const [width, setWidth] = useState(0);
  const [deck, setDeck] = useState<Deck>('LOWER');

  const hasUpper = seats.some((x) => x.deck === 'UPPER');
  const active = seats.filter((x) => x.deck === deck);
  const cols = Math.max(5, ...active.map((x) => x.xPosition + x.colSpan));
  const rows = Math.max(1, ...active.map((x) => x.yPosition + x.rowSpan));

  const cellW = width > 0 ? (width - PAD * 2 - GAP * (cols - 1)) / cols : 0;
  const cellH = Math.min(Math.max(cellW, 44), 64);
  const height = rows * cellH + (rows - 1) * GAP + PAD * 2;

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const visual = (seat: SeatState): Visual => {
    if (selected.includes(seat.seatTemplateId)) return 'selected';
    if (seat.status === 'BOOKED') return 'booked';
    if (seat.status === 'LOCKED') return 'locked';
    return 'available';
  };

  return (
    <View style={{ gap: 12 }}>
      <SeatLegend />
      {hasUpper && (
        <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.gray200 }}>
          {(['LOWER', 'UPPER'] as Deck[]).map((d) => (
            <Pressable key={d} onPress={() => setDeck(d)} style={[s.tab, deck === d && { borderBottomColor: colors.brand600 }]}>
              <Text style={{ fontWeight: '600', color: deck === d ? colors.brand600 : colors.gray400 }}>
                {d === 'LOWER' ? t('lowerDeck') : t('upperDeck')}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
      <View onLayout={onLayout} style={[s.bus, { height: width > 0 ? height : 200 }]}>
        {width > 0 && (
          <>
            {cols > 3 && (
              <View
                style={{
                  position: 'absolute', top: PAD, bottom: PAD, left: PAD + 2 * (cellW + GAP), width: cellW,
                  backgroundColor: colors.gray100, borderRadius: 6,
                }}
              />
            )}
            {active.map((seat) => {
              const v = visual(seat);
              const c = palette(seat, v);
              const disabled = v === 'booked' || v === 'locked';
              return (
                <Pressable
                  key={seat.seatTemplateId}
                  disabled={disabled}
                  onPress={() => onToggle(seat)}
                  accessibilityLabel={`${seat.seatNumber} ${v}`}
                  style={{
                    position: 'absolute',
                    left: PAD + seat.xPosition * (cellW + GAP),
                    top: PAD + seat.yPosition * (cellH + GAP),
                    width: seat.colSpan * cellW + (seat.colSpan - 1) * GAP,
                    height: seat.rowSpan * cellH + (seat.rowSpan - 1) * GAP,
                    backgroundColor: c.bg, borderColor: c.border, borderWidth: 2, borderRadius: 6,
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: c.fg }}>{seat.seatNumber}</Text>
                  {seat.type === 'SLEEPER' && <Ionicons name="bed-outline" size={12} color={c.fg} />}
                  {v === 'locked' && <Ionicons name="lock-closed" size={11} color={c.fg} style={{ position: 'absolute', top: 2, right: 2 }} />}
                </Pressable>
              );
            })}
          </>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  tab: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  bus: { borderWidth: 4, borderColor: colors.gray300, borderRadius: 20, backgroundColor: colors.white, overflow: 'hidden' },
});
