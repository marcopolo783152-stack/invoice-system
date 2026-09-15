export const APPOINTMENT_ZONE = 'America/New_York';
export const APPOINTMENT_STAFF = [
  { id: 'nazif', name: 'Mr. M. Nazif Manager of Marco Polo' },
  { id: 'farid', name: 'Mr. Farid General Manager' },
] as const;

export function appointmentSlots() {
  return Array.from({ length: 16 }, (_, index) => 600 + index * 30)
    .filter(minutes => minutes !== 810)
    .map(minutes => {
      const hour = Math.floor(minutes / 60);
      return { value: String(hour).padStart(2, '0') + ':' + String(minutes % 60).padStart(2, '0'),
        label: (hour % 12 || 12) + ':' + String(minutes % 60).padStart(2, '0') + (hour < 12 ? ' AM' : ' PM') };
    });
}

export function showroomNow(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: APPOINTMENT_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now);
  const get = (type: string) => parts.find(p => p.type === type)?.value || '';
  return { date: get('year') + '-' + get('month') + '-' + get('day'), time: get('hour') + ':' + get('minute') };
}

export function isFutureSlot(date: string, time: string, now = new Date()) {
  const local = showroomNow(now);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    appointmentSlots().some(slot => slot.value === time) &&
    (date > local.date || (date === local.date && time > local.time));
}
