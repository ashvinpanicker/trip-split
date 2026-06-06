'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Users, BarChart2, Receipt, Copy, Check } from 'lucide-react';
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
import { calculateGroupBalances, simplifyDebts, formatCurrency, type BalancePerson } from '@/lib/utils/balance';
import type { Expense, ExpenseParticipant } from '@/types';

type Tab = 'expenses' | 'balances' | 'members';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button onClick={copy} className="p-1.5 hover:bg-gray-100 rounded-lg flex-shrink-0">
      {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} className="text-gray-400" />}
    </button>
  );
}

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
        <div className="p-4 space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
      </div>
    );
  }

  if (!group || !user) return null;

  const realMembers: BalancePerson[] = (group.members || []).map((m: any) => {
    const p = m.profile as any;
    return { id: m.user_id, name: p?.full_name || p?.email || 'Unknown', avatar_url: p?.avatar_url };
  });

  const pendingMembers: BalancePerson[] = (group.pending_members || [])
    .filter((pm: any) => !pm.claimed_by)
    .map((pm: any) => ({ id: pm.id, name: pm.name, is_pending: true }));

  const allPersons = [...realMembers, ...pendingMembers];

  const expensesWithParts = expenses.filter((e) => e.participants) as (Expense & { participants: ExpenseParticipant[] })[];
  const balances = calculateGroupBalances(expensesWithParts, allPersons);
  const settlements = simplifyDebts(balances);
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const myBalance = balances.find((b) => b.person_id === user.id);

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://trip-split-cyan-five.vercel.app';

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

      {/* Stats */}
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
            <p className="font-bold text-gray-900">
              {realMembers.length}
              {pendingMembers.length > 0 && <span className="text-amber-500 text-xs ml-1">+{pendingMembers.length}</span>}
            </p>
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
                tab === key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 p-4 space-y-3">
        {/* Expenses tab */}
        {tab === 'expenses' && (
          expLoading ? (
            <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
          ) : expenses.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No expenses yet"
              description="Add your first expense"
              action={<Button onClick={() => setShowAddExpense(true)}><Plus size={16} className="mr-1" /> Add expense</Button>}
            />
          ) : (
            expenses.map((expense) => (
              <ExpenseCard
                key={expense.id}
                expense={expense}
                currentUserId={user.id}
                onDelete={refetchExpenses}
                onUpdate={refetchExpenses}
              />
            ))
          )
        )}

        {/* Balances tab */}
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

        {/* Members tab */}
        {tab === 'members' && (
          <div className="space-y-3">
            <InviteCard inviteCode={group.invite_code} groupName={group.name} />

            {/* Real members */}
            <Card padding="none">
              {(group.members || []).map((m: any, idx: number) => {
                const p = m.profile as any;
                const name = p?.full_name || p?.email || 'Unknown';
                return (
                  <div key={m.user_id} className={`flex items-center gap-3 px-4 py-3 ${idx > 0 ? 'border-t border-gray-50' : ''}`}>
                    <Avatar src={p?.avatar_url} name={name} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{name}</p>
                      <p className="text-xs text-gray-500">{p?.email}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${m.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                      {m.role}
                    </span>
                  </div>
                );
              })}
            </Card>

            {/* Pending members */}
            {pendingMembers.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 px-1">
                  Pending ({pendingMembers.length})
                </p>
                <Card padding="none">
                  {(group.pending_members || []).filter((pm: any) => !pm.claimed_by).map((pm: any, idx: number) => {
                    const inviteUrl = `${origin}/join/${group.invite_code}?for=${pm.invite_token}`;
                    return (
                      <div key={pm.id} className={`px-4 py-3 ${idx > 0 ? 'border-t border-gray-50' : ''}`}>
                        <div className="flex items-center gap-3">
                          <Avatar name={pm.name} size="md" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900">{pm.name}</p>
                            <p className="text-xs text-amber-600">Hasn&apos;t joined yet</p>
                          </div>
                          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">pending</span>
                        </div>
                        <div className="mt-2 flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                          <p className="text-xs text-gray-500 flex-1 truncate">{inviteUrl}</p>
                          <CopyButton text={inviteUrl} />
                        </div>
                      </div>
                    );
                  })}
                </Card>
              </div>
            )}
          </div>
        )}
      </div>

      <AddExpenseModal
        open={showAddExpense}
        onClose={() => setShowAddExpense(false)}
        groupId={id}
        onSuccess={refetchExpenses}
      />
    </div>
  );
}
