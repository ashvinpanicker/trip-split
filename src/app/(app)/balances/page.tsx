'use client';

import { useRouter } from 'next/navigation';
import { BarChart2, ChevronRight } from 'lucide-react';
import AppHeader from '@/components/layout/AppHeader';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import { useUser } from '@/hooks/useUser';
import { useGroups } from '@/hooks/useGroups';
import { useMyTotals } from '@/hooks/useExpenses';
import { formatCurrency, myNetByGroup, totalsByCurrency } from '@/lib/utils/balance';

/**
 * Your balance in each trip. Groups are kept separate: each has its own currency and its own
 * settle-up rules, so we never net or simplify across groups. Tap a trip to settle up there.
 */
export default function BalancesPage() {
  const router = useRouter();
  const { user } = useUser();
  const { groups, loading: groupsLoading } = useGroups();
  const totals = useMyTotals();

  if (!user) return null;

  // Tracking-only trips have no balances
  const perGroup = Object.fromEntries(Object.entries(myNetByGroup(user.id, totals.expenses, totals.payments)).filter(([gid]) => !groups.find((g) => g.id === gid)?.track_only));
  const currencyOf = (gid: string) => groups.find((g) => g.id === gid)?.currency || 'INR';
  const byCurrency = Object.entries(totalsByCurrency(perGroup, currencyOf))
    .sort((a, b) => Number(b[0] === 'INR') - Number(a[0] === 'INR'));
  const rows = groups
    .map((g) => ({ g, net: perGroup[g.id] ?? 0 }))
    .sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
  const loading = groupsLoading || totals.loading;

  return (
    <div className="flex flex-col">
      <AppHeader title="Balances" />
      <div className="p-4 space-y-4">
        {loading ? (
          <div className="space-y-3">{[1, 2].map((i) => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
        ) : groups.length === 0 ? (
          <EmptyState icon={BarChart2} title="No balances yet" description="Join a group and add expenses to see balances" />
        ) : (
          <>
            {byCurrency.length > 0 ? byCurrency.map(([code, t]) => (
              <Card key={code} className={t.net > 0 ? 'bg-green-50 border-green-100' : t.net < 0 ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}>
                <p className="text-sm text-gray-600 mb-1">Across your {code === 'INR' && byCurrency.length === 1 ? '' : `${code} `}trips</p>
                <p className={`text-3xl font-bold ${t.net > 0 ? 'text-green-700' : t.net < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                  {t.net === 0 ? 'All settled up' : `${t.net > 0 ? '+' : ''}${formatCurrency(t.net, code)}`}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  You&apos;re owed {formatCurrency(t.owed, code)} · you owe {formatCurrency(t.owe, code)}
                </p>
              </Card>
            )) : (
              <Card className="bg-gray-50 border-gray-100"><p className="text-lg font-bold text-gray-600">All settled up</p></Card>
            )}

            <Card padding="none">
              <h3 className="font-semibold text-gray-900 px-4 pt-4 pb-2">By trip</h3>
              {rows.map(({ g, net }) => (
                <button
                  key={g.id}
                  onClick={() => router.push(`/groups/${g.id}`)}
                  className="w-full flex items-center gap-3 px-4 py-3 border-t border-gray-50 text-left active:bg-gray-50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{g.name}</p>
                    <p className="text-xs text-gray-500">
                      {g.track_only ? 'just tracking spending' : net > 0 ? 'you get back' : net < 0 ? 'you owe' : 'settled up'}
                    </p>
                  </div>
                  <span className={`text-sm font-bold tabular-nums ${net > 0 ? 'text-green-600' : net < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                    {net === 0 ? '—' : formatCurrency(Math.abs(net), g.currency || 'INR')}
                  </span>
                  <ChevronRight size={16} className="text-gray-300 shrink-0" />
                </button>
              ))}
            </Card>
            <p className="text-xs text-gray-400 text-center">Open a trip to see who to pay and settle up.</p>
          </>
        )}
      </div>
    </div>
  );
}
