// Buses run in India, so times are always shown in IST (UTC+05:30, no DST). Done by hand to
// avoid depending on Intl time-zone support in the JS engine.
const IST_OFFSET_MS = 330 * 60 * 1000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const p2 = (n: number) => String(n).padStart(2, '0');

function ist(value: string | Date): Date | null {
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getTime() + IST_OFFSET_MS);
}

export function formatTime(value: string | Date): string {
  const d = ist(value);
  if (!d) return '-';
  const h = d.getUTCHours();
  return `${p2(h % 12 || 12)}:${p2(d.getUTCMinutes())} ${h < 12 ? 'AM' : 'PM'}`;
}

export function formatDate(value: string | Date): string {
  const d = ist(value);
  if (!d) return '-';
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function formatDateTime(value: string | Date): string {
  return `${formatDate(value)}, ${formatTime(value)}`;
}

/** YYYY-MM-DD in the device's local calendar (what the search API expects). */
export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
}

export function nextDays(count: number): { iso: string; day: string; label: string }[] {
  const out: { iso: string; day: string; label: string }[] = [];
  const base = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
    out.push({ iso: toISODate(d), day: i === 0 ? 'Today' : DAYS[d.getDay()], label: `${d.getDate()} ${MONTHS[d.getMonth()]}` });
  }
  return out;
}

export function formatINR(value: number | string): string {
  const n = Number(value);
  return `₹${Number.isFinite(n) ? n : 0}`;
}

export function seatNumbers(passengerInfo: unknown): string {
  if (passengerInfo && typeof passengerInfo === 'object' && 'seatNumbers' in passengerInfo) {
    const list = (passengerInfo as { seatNumbers?: string[] }).seatNumbers;
    if (Array.isArray(list) && list.length) return list.join(', ');
  }
  return '-';
}
