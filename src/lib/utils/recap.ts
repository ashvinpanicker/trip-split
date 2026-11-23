import { format } from 'date-fns';
import { formatCurrency } from './balance';
import type { TripStats } from './stats';
import type { Settlement } from '@/types';

/** "22–25 Nov 2026" (or one day / across months) */
export function tripDates(first: string | null, last: string | null): string {
  if (!first || !last) return '';
  const a = new Date(first), b = new Date(last);
  if (first === last) return format(a, 'd MMM yyyy');
  return a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()
    ? `${format(a, 'd')}–${format(b, 'd MMM yyyy')}`
    : `${format(a, 'd MMM')} – ${format(b, 'd MMM yyyy')}`;
}

/** The trip recap as a WhatsApp message, for friends who never opened the app. */
export function recapText(o: {
  name: string; people: number; stats: TripStats; open: Settlement[]; link: string; currency?: string;
}): string {
  const { stats: s, open } = o;
  const money = (n: number) => formatCurrency(n, o.currency);
  const lines = [
    `🌅 *${o.name}* is a wrap!`,
    [tripDates(s.firstDay, s.lastDay), s.days > 1 ? `${s.days} days` : '', `${o.people} people`].filter(Boolean).join(' · '),
    '',
    `💸 ${money(s.total)} spent, about ${money(s.perHead)} each`,
    ...s.byCategory.slice(0, 3).map((c) => `${c.emoji} ${c.label}: ${money(c.total)}`),
    ...(s.biggest ? [`🏆 Biggest bill: ${s.biggest.title} (${money(s.biggest.amount)}, ${s.biggest.payer})`] : []),
    ...(s.awards.length ? ['', ...s.awards.slice(0, 3).map((a) => `${a.emoji} ${a.title}: ${a.who}`)] : []),
    '',
    open.length
      ? ['Still to settle:', ...open.map((x) => `• ${x.from_name} → ${x.to_name}: ${money(x.amount)}`)].join('\n')
      : '✅ Everyone’s settled up.',
    '',
    `Every bill: ${o.link}`,
  ];
  return lines.join('\n');
}
