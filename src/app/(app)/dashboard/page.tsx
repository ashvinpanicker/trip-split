'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, TrendingUp, TrendingDown, Users } from 'lucide-react';
import AppHeader from '@/components/layout/AppHeader';
import Avatar from '@/components/ui/Avatar';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import ExpenseCard from '@/components/expenses/ExpenseCard';
import { useUser } from '@/hooks/useUser';
import { useGroups } from '@/hooks/useGroups';
import { useAllExpenses } from '@/hooks/useExpenses';
import { formatCurrency } from '@/lib/utils/balance';

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useUser();
  const { groups } = useGroups();
  const { expenses, loading: expLoading } = useAllExpenses();

  if (!user) return null;

  // Simple dashboard balance: sum up what user owes vs is owed across all expenses
  let totalOwed = 0;
  let totalOwe = 0;

  for (const exp of expenses) {
    const myPart = exp.participants?.find((p) => p.user_id === user.id);
    if (!myPart) continue;

    if (exp.paid_by === user.id) {
      // User paid — others owe user
      const othersShare = (exp.participants || [])
        .filter((p) => p.user_id !== user.id)
        .reduce((s, p) => s + p.share_amount, 0);
      totalOwed += othersShare;
    } else {
      // Someone else paid — user owes their share
      totalOwe += myPart.share_amount;
    }
  }

  const net = totalOwed - totalOwe;

  return (
    <div className="flex flex-col">
      <AppHeader
        title={`Hi, ${user.full_name?.split(' ')[0] || 'there'} 👋`}
        subtitle="Here's your summary"
        right={<Avatar src={user.avatar_url} name={user.full_name || user.email} size="sm" />}
      />

      <div className="p-4 space-y-4">
        {/* Balance summary */}
        <Card className="bg-gradient-to-br from-blue-600 to-blue-700 border-0 text-white">
          <p className="text-blue-100 text-sm mb-1">Net Balance</p>
          <p className={`text-3xl font-bold mb-3 ${net >= 0 ? 'text-white' : 'text-red-200'}`}>
            {net >= 0 ? '+' : ''}{formatCurrency(net)}
          </p>
          <div className="flex gap-4">
            <div>
              <div className="flex items-center gap-1 text-blue-200 text-xs mb-0.5">
                <TrendingUp size={12} /> You are owed
              </div>
              <p className="text-white font-semibold">{formatCurrency(totalOwed)}</p>
            </div>
            <div className="w-px bg-blue-500" />
            <div>
              <div className="flex items-center gap-1 text-blue-200 text-xs mb-0.5">
                <TrendingDown size={12} /> You owe
              </div>
              <p className="text-white font-semibold">{formatCurrency(totalOwe)}</p>
            </div>
          </div>
        </Card>

        {/* Groups quick access */}
        {groups.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-900">Your Groups</h2>
              <button onClick={() => router.push('/groups')} className="text-blue-600 text-sm">
                See all
              </button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
              {groups.slice(0, 5).map((g) => (
                <button
                  key={g.id}
                  onClick={() => router.push(`/groups/${g.id}`)}
                  className="flex flex-col items-center gap-1.5 flex-shrink-0"
                >
                  <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center text-2xl shadow-sm">
                    {g.name[0].toUpperCase()}
                  </div>
                  <span className="text-xs text-gray-700 font-medium w-14 text-center truncate">{g.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Recent expenses */}
        <div>
          <h2 className="font-semibold text-gray-900 mb-3">Recent Activity</h2>
          {expLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : expenses.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No expenses yet"
              description="Create a group and add your first expense"
            />
          ) : (
            <div className="space-y-3">
              {expenses.slice(0, 10).map((expense) => (
                <ExpenseCard
                  key={expense.id}
                  expense={expense}
                  currentUserId={user.id}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
