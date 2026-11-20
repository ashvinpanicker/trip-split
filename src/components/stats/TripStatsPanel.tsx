'use client';

import { format } from 'date-fns';
import Card from '@/components/ui/Card';
import Avatar from '@/components/ui/Avatar';
import { formatCurrency } from '@/lib/utils/balance';
import type { TripStats, PersonTotal } from '@/lib/utils/stats';

function Bars({ rows, me, color = 'bg-blue-500' }: { rows: PersonTotal[]; me: string; color?: string }) {
  const max = Math.max(...rows.map((r) => r.total), 1);
  return (
    <div className="space-y-2.5">
      {rows.map((r) => (
        <div key={r.id}>
          <div className="flex justify-between gap-3 text-sm mb-1">
            <span className={`truncate ${r.id === me ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>{r.id === me ? 'You' : r.name}</span>
            <span className="font-medium text-gray-900 tabular-nums shrink-0">{formatCurrency(r.total)}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${r.id === me ? 'bg-blue-700' : color}`} style={{ width: `${(r.total / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function TripStatsPanel({ stats, me }: { stats: TripStats; me: string }) {
  if (stats.count === 0) {
    return <p className="text-sm text-gray-500 text-center py-10">Add a few expenses and your trip stats show up here.</p>;
  }
  const maxDay = Math.max(...stats.byDay.map((d) => d.total), 1);

  return (
    <div className="space-y-3">
      {/* Headline numbers */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Spent', value: formatCurrency(stats.total) },
          { label: 'Per person', value: formatCurrency(stats.perHead) },
          { label: stats.days > 1 ? `Per day (${stats.days})` : 'Expenses', value: stats.days > 1 ? formatCurrency(stats.perDay) : String(stats.count) },
        ].map((k) => (
          <div key={k.label} className="bg-white rounded-2xl border border-gray-100 p-3 min-w-0">
            <p className="text-xs text-gray-500 truncate">{k.label}</p>
            <p className="font-bold text-gray-900 truncate tabular-nums">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Awards: the fun bit */}
      {stats.awards.length > 0 && (
        <Card>
          <h3 className="font-semibold text-gray-900 mb-3">Trip awards</h3>
          <div className="grid grid-cols-2 gap-2">
            {stats.awards.map((a) => (
              <div key={a.title} className="rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 p-3 min-w-0">
                <p className="text-2xl leading-none">{a.emoji}</p>
                <p className="text-xs text-amber-800 font-semibold mt-2">{a.title}</p>
                <div className="flex items-center gap-1.5 mt-1 min-w-0">
                  <Avatar name={a.who} size="xs" />
                  <p className="text-sm font-bold text-gray-900 truncate">{a.whoId === me ? 'You' : a.who}</p>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{a.detail}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Categories */}
      <Card>
        <h3 className="font-semibold text-gray-900 mb-3">Where the money went</h3>
        <div className="flex h-3 rounded-full overflow-hidden mb-3" aria-hidden>
          {stats.byCategory.map((c, i) => (
            <div key={c.key} style={{ width: `${(c.total / stats.total) * 100}%` }} className={['bg-blue-600', 'bg-amber-400', 'bg-emerald-500', 'bg-rose-400', 'bg-violet-500', 'bg-cyan-500', 'bg-gray-400'][i % 7]} />
          ))}
        </div>
        <div className="space-y-1.5">
          {stats.byCategory.map((c) => (
            <div key={c.key} className="flex justify-between text-sm">
              <span className="text-gray-700">{c.emoji} {c.label}</span>
              <span className="text-gray-900 font-medium tabular-nums">
                {formatCurrency(c.total)} <span className="text-gray-400 font-normal">{Math.round((c.total / stats.total) * 100)}%</span>
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Daily spend */}
      {stats.byDay.length > 1 && (
        <Card>
          <h3 className="font-semibold text-gray-900 mb-3">Spend by day</h3>
          <div className="flex items-end gap-1.5 h-32" role="img" aria-label="Daily spending chart">
            {stats.byDay.map((d) => (
              <div key={d.date} className="flex-1 min-w-0 flex flex-col items-center justify-end h-full gap-1">
                <div className="w-full bg-blue-500 rounded-t-md" style={{ height: `${Math.max((d.total / maxDay) * 100, 2)}%` }} title={formatCurrency(d.total)} />
                <span className="text-[10px] text-gray-500 truncate w-full text-center">{format(new Date(d.date), 'd MMM')}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Biggest day: {format(new Date(stats.byDay.reduce((a, b) => (b.total > a.total ? b : a)).date), 'EEE d MMM')}, {formatCurrency(maxDay)}
          </p>
        </Card>
      )}

      <Card>
        <h3 className="font-semibold text-gray-900">Who paid upfront</h3>
        <p className="text-xs text-gray-500 mb-3">Money put down at the counter</p>
        <Bars rows={stats.paidUpfront} me={me} />
      </Card>

      <Card>
        <h3 className="font-semibold text-gray-900">Who spent the most</h3>
        <p className="text-xs text-gray-500 mb-3">Each person’s share of everything</p>
        <Bars rows={stats.spent} me={me} color="bg-emerald-500" />
      </Card>

      {stats.biggest && (
        <Card className="bg-gray-50">
          <p className="text-xs text-gray-500">Biggest single expense</p>
          <p className="font-semibold text-gray-900">{stats.biggest.title}: {formatCurrency(stats.biggest.amount)}</p>
          <p className="text-xs text-gray-500">paid by {stats.biggest.payer}</p>
        </Card>
      )}
    </div>
  );
}
