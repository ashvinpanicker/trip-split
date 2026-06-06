'use client';

import { useEffect, useState } from 'react';
import { BarChart2 } from 'lucide-react';
import AppHeader from '@/components/layout/AppHeader';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import BalanceList from '@/components/balances/BalanceList';
import SettlementList from '@/components/balances/SettlementList';
import { useUser } from '@/hooks/useUser';
import { useGroups } from '@/hooks/useGroups';
import { createClient } from '@/lib/supabase/client';
import { calculateGroupBalances, simplifyDebts, formatCurrency, type BalancePerson } from '@/lib/utils/balance';
import type { Balance, Settlement, Expense, ExpenseParticipant } from '@/types';

export default function BalancesPage() {
  const { user } = useUser();
  const { groups } = useGroups();
  const [allBalances, setAllBalances] = useState<Balance[]>([]);
  const [allSettlements, setAllSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (!user || groups.length === 0) { setLoading(false); return; }

    async function loadAll() {
      setLoading(true);
      const groupIds = groups.map((g) => g.id);

      const [{ data: expensesData }, { data: membersData }, { data: pendingData }] = await Promise.all([
        supabase
          .from('expenses')
          .select(`id, group_id, paid_by, amount, split_type, date,
            participants:expense_participants(user_id, pending_member_id, share_amount, share_percentage)`)
          .in('group_id', groupIds),
        supabase
          .from('group_members')
          .select('user_id, profile:profiles(id, email, full_name, avatar_url)')
          .in('group_id', groupIds),
        supabase
          .from('pending_members')
          .select('id, name')
          .in('group_id', groupIds)
          .is('claimed_by', null),
      ]);

      const uniquePersons: Record<string, BalancePerson> = {};
      for (const m of membersData || []) {
        const p = m.profile as any;
        if (p) uniquePersons[p.id] = { id: p.id, name: p.full_name || p.email, avatar_url: p.avatar_url };
      }
      for (const pm of pendingData || []) {
        uniquePersons[pm.id] = { id: pm.id, name: pm.name, is_pending: true };
      }

      const expenses = (expensesData || []) as (Expense & { participants: ExpenseParticipant[] })[];
      const persons = Object.values(uniquePersons);

      setAllBalances(calculateGroupBalances(expenses, persons));
      setAllSettlements(simplifyDebts(calculateGroupBalances(expenses, persons)));
      setLoading(false);
    }

    loadAll();
  }, [user, groups]);

  if (!user) return null;

  const myBalance = allBalances.find((b) => b.person_id === user.id);

  return (
    <div className="flex flex-col">
      <AppHeader title="Balances" />
      <div className="p-4 space-y-4">
        {myBalance && (
          <Card className={myBalance.net_balance > 0.01 ? 'bg-green-50 border-green-100' : myBalance.net_balance < -0.01 ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}>
            <p className="text-sm text-gray-600 mb-1">Your overall balance</p>
            <p className={`text-3xl font-bold ${myBalance.net_balance > 0.01 ? 'text-green-700' : myBalance.net_balance < -0.01 ? 'text-red-600' : 'text-gray-600'}`}>
              {myBalance.net_balance > 0.01 ? `+${formatCurrency(myBalance.net_balance)}` : myBalance.net_balance < -0.01 ? formatCurrency(myBalance.net_balance) : 'All settled up!'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {myBalance.net_balance > 0.01 ? 'You are owed across all groups' : myBalance.net_balance < -0.01 ? 'You owe across all groups' : 'No outstanding balances'}
            </p>
          </Card>
        )}

        {loading ? (
          <div className="space-y-3">{[1, 2].map((i) => <div key={i} className="h-32 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
        ) : groups.length === 0 ? (
          <EmptyState icon={BarChart2} title="No balances yet" description="Join a group and add expenses to see balances" />
        ) : (
          <>
            <Card>
              <h3 className="font-semibold text-gray-900 mb-3">All Balances</h3>
              <BalanceList balances={allBalances} currentUserId={user.id} />
            </Card>
            <Card>
              <h3 className="font-semibold text-gray-900 mb-3">Suggested Settlements</h3>
              <SettlementList settlements={allSettlements} currentUserId={user.id} />
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
