'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Users, BarChart2, Receipt, ChevronRight } from 'lucide-react';
import AppHeader from '@/components/layout/AppHeader';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import Avatar from '@/components/ui/Avatar';
import Card from '@/components/ui/Card';
import ExpenseCard from '@/components/expenses/ExpenseCard';
import AddExpenseModal from '@/components/expenses/AddExpenseModal';
import InviteCard from '@/components/groups/InviteCard';
import BalanceList from '@/components/balances/BalanceList';
import SettlementList from '@/components/balances/SettlementList';
import { useGroup } from '@/hooks/useGroups';
import { useExpenses } from '@/hooks/useExpenses';
import { useUser } from '@/hooks/useUser';
import { calculateGroupBalances, simplifyDebts, formatCurrency } from '@/lib/utils/balance';
import type { Expense, ExpenseParticipant } from '@/types';

type Tab = 'expenses' | 'balances' | 'members';

export default function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useUser();
  const { group, loading: groupLoading, refetch: refetchGroup } = useGroup(id);
  const { expenses, loading: expLoading, refetch: refetchExpenses } = useExpenses(id);
  const [tab, setTab] = useState<Tab>('expenses');
  const [showAddExpense, setShowAddExpense] = useState(false);

  if (groupLoading) {
    return (
      <div className="flex flex-col">
        <AppHeader title="Loading..." left={<button onClick={() => router.back()}><ArrowLeft size={20} /></button>} />
        <div className="p-4 space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!group || !user) return null;

  const members = (group.members || []).map((m: any) => m.profile).filter(Boolean);

  const expensesWithParticipants = expenses.filter((e) => e.participants) as (Expense & { participants: ExpenseParticipant[] })[];
  const balances = calculateGroupBalances(expensesWithParticipants, members);
  const settlements = simplifyDebts(balances);

  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const myBalance = balances.find((b) => b.user_id === user.id);

  function handleExpenseChange() {
    refetchExpenses();
  }

  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader
        title={group.name}
        subtitle={group.description || undefined}
        left={
          <button onClick={() => router.back()} className="p-1 hover:bg-gray-100 rounded-lg">
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
        }
        right={
          <Button size="sm" onClick={() => setShowAddExpense(true)}>
            <Plus size={14} className="mr-1" /> Add
          </Button>
        }
      />

      {/* Stats bar */}
      <div className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="flex gap-4">
          <div className="flex-1">
            <p className="text-xs text-gray-500">Total Spent</p>
            <p className="font-bold text-gray-900">{formatCurrency(totalExpenses)}</p>
          </div>
          <div className="flex-1">
            <p className="text-xs text-gray-500">My Balance</p>
            <p className={`font-bold ${myBalance && myBalance.net_balance >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {myBalance ? (myBalance.net_balance >= 0 ? '+' : '') + formatCurrency(myBalance.net_balance) : '—'}
            </p>
          </div>
          <div className="flex-1">
            <p className="text-xs text-gray-500">Members</p>
            <p className="font-bold text-gray-900">{members.length}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100">
        <div className="flex">
          {([
            { key: 'expenses', label: 'Expenses', icon: Receipt },
            { key: 'balances', label: 'Balances', icon: BarChart2 },
            { key: 'members', label: 'Members', icon: Users },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 p-4 space-y-3">
        {tab === 'expenses' && (
          <>
            {expLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />)}
              </div>
            ) : expenses.length === 0 ? (
              <EmptyState
                icon={Receipt}
                title="No expenses yet"
                description="Add your first expense to start tracking"
                action={
                  <Button onClick={() => setShowAddExpense(true)}>
                    <Plus size={16} className="mr-1" /> Add expense
                  </Button>
                }
              />
            ) : (
              expenses.map((expense) => (
                <ExpenseCard
                  key={expense.id}
                  expense={expense}
                  currentUserId={user.id}
                  onDelete={handleExpenseChange}
                  onUpdate={handleExpenseChange}
                />
              ))
            )}
          </>
        )}

        {tab === 'balances' && (
          <div className="space-y-4">
            <Card>
              <h3 className="font-semibold text-gray-900 mb-3">Net Balances</h3>
              <BalanceList balances={balances} currentUserId={user.id} />
            </Card>
            <Card>
              <h3 className="font-semibold text-gray-900 mb-3">Suggested Settlements</h3>
              <SettlementList settlements={settlements} currentUserId={user.id} />
            </Card>
          </div>
        )}

        {tab === 'members' && (
          <div className="space-y-3">
            <InviteCard inviteCode={group.invite_code} groupName={group.name} />
            <Card padding="none">
              {(group.members || []).map((m: any, idx: number) => {
                const profile = m.profile as any;
                const name = profile?.full_name || profile?.email || 'Unknown';
                return (
                  <div
                    key={m.user_id}
                    className={`flex items-center gap-3 px-4 py-3 ${idx > 0 ? 'border-t border-gray-50' : ''}`}
                  >
                    <Avatar src={profile?.avatar_url} name={name} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{name}</p>
                      <p className="text-xs text-gray-500">{profile?.email}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      m.role === 'admin'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {m.role}
                    </span>
                  </div>
                );
              })}
            </Card>
          </div>
        )}
      </div>

      <AddExpenseModal
        open={showAddExpense}
        onClose={() => setShowAddExpense(false)}
        groupId={id}
        onSuccess={handleExpenseChange}
      />
    </div>
  );
}
