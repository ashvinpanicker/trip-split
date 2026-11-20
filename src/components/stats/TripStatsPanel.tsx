'use client';

import Card from '@/components/ui/Card';
import Avatar from '@/components/ui/Avatar';
import { formatCurrency } from '@/lib/utils/balance';
import type { TripStats } from '@/lib/utils/stats';
import { CategoryDonut, DailyStacked, FrontedBars } from './Charts';

export default function TripStatsPanel({ stats, me }: { stats: TripStats; me: string }) {
  if (stats.count === 0) {
    return <p className="text-sm text-gray-500 text-center py-10">Add a few expenses and your trip stats show up here.</p>;
  }

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

      {/* Where the money went */}
      <Card>
        <h3 className="font-semibold text-gray-900 mb-3">Where the money went</h3>
        <CategoryDonut stats={stats} />
      </Card>

      {/* Day by day */}
      {stats.byDayCategory.length > 1 && (
        <Card>
          <h3 className="font-semibold text-gray-900">Day by day</h3>
          <p className="text-xs text-gray-500 mb-2">Tap a day to see what it went on</p>
          <DailyStacked stats={stats} />
        </Card>
      )}

      {/* Who fronted the money */}
      <Card>
        <h3 className="font-semibold text-gray-900 mb-2">Who fronted the money</h3>
        <FrontedBars stats={stats} me={me} />
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
