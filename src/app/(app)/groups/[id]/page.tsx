'use client';

import PageSkeleton from '@/components/ui/PageSkeleton';
import { useT } from '@/lib/i18n';
import { useState, use, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Users, Receipt, Copy, Check, Trash2, History, Search, Download } from 'lucide-react';
import { format } from 'date-fns';
import AppHeader from '@/components/layout/AppHeader';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import Avatar from '@/components/ui/Avatar';
import Card from '@/components/ui/Card';
import ExpenseCard from '@/components/expenses/ExpenseCard';
import AddExpenseModal from '@/components/expenses/AddExpenseModal';
import SettleUpPanel from '@/components/balances/SettleUpPanel';
import PersonSheet from '@/components/balances/PersonSheet';
import ActivityFeed from '@/components/activity/ActivityFeed';
import TripStatsPanel from '@/components/stats/TripStatsPanel';
import CurrencySelect from '@/components/groups/CurrencySelect';
import { tripStats, filterExpenses } from '@/lib/utils/stats';
import { expensesCsv } from '@/lib/utils/export';
import { readPayMethods, type PayMethod } from '@/lib/utils/payMethods';
import GroupKindPicker from '@/components/groups/GroupKindPicker';
import type { GroupKind } from '@/lib/utils/groupKinds';
import AddPeopleCard from '@/components/groups/AddPeopleCard';
import InviteCard from '@/components/groups/InviteCard';
import { useGroup } from '@/hooks/useGroups';
import { useExpenses, useSettlements } from '@/hooks/useExpenses';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { useUser } from '@/hooks/useUser';
import { useAdvancedPref } from '@/hooks/useAdvanced';
import { setActiveCurrency, calculateGroupBalances, smartSettle, directDebts, formatCurrency, categoryOf, type BalancePerson } from '@/lib/utils/balance';
import type { Expense, ExpenseParticipant } from '@/types';
import { paidBackMap } from '@/lib/utils/paidBack';
import { motion } from 'motion/react';
import { PendingChanges, useOutbox } from '@/components/pwa/Sync';
import { enter, spring } from '@/lib/motion';

const EMPTY = new Set<string>();

type Tab = 'expenses' | 'balances' | 'stats' | 'members' | 'activity';

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
  const { expenses, loading: expLoading } = useExpenses(id);
  const { settlements: payments, refetch: refetchPayments } = useSettlements(id);
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>('expenses');
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [personId, setPersonId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [catFilter, setCatFilter] = useState<string | null>(null);
  const [payerFilter, setPayerFilter] = useState<string | null>(null);
  // One signal for "something changed": expenses, totals and the activity feed all reload on it
  const changed = () => window.dispatchEvent(new Event('tripsplit:expenses-changed'));
  // Payments saved offline count straight away, so nobody taps "Mark paid" twice
  const queued = useOutbox(id);
  const counted = useMemo(
    () => [...payments, ...queued.flatMap((o) => (o.kind === 'payments' ? o.rows : []))],
    [payments, queued]
  );
  const paidBack = useMemo(() => paidBackMap(counted, expenses), [counted, expenses]);
  // null = no saved choice yet (admins then see advanced features)
  const advancedPref = useAdvancedPref();
  const t = useT();

  if (groupLoading) {
    return (
      <div className="flex flex-col">
        <AppHeader title="Loading..." left={<button onClick={() => router.back()}><ArrowLeft size={20} /></button>} />
        <div className="p-4 space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
      </div>
    );
  }

  if (!group) return <p className="p-6 text-center text-gray-500">This trip doesn&apos;t exist, or you&apos;re not in it.</p>;
  if (!user) return <PageSkeleton />;
  // Everything below formats money in this trip's currency (symbol only, no conversion)
  setActiveCurrency(group.currency);

  const realMembers: BalancePerson[] = (group.members || []).map((m: any) => {
    const p = m.profile as any;
    return { id: m.user_id, name: p?.full_name || p?.email || 'Unknown', avatar_url: p?.avatar_url };
  });

  const pendingMembers: BalancePerson[] = (group.pending_members || [])
    .filter((pm: any) => !pm.claimed_by)
    .map((pm: any) => ({ id: pm.id, name: pm.name, is_pending: true }));

  const allPersons = [...realMembers, ...pendingMembers];
  const nameOf = (pid: string) =>
    pid === user.id ? t('you') : allPersons.find((p) => p.id === pid)?.name ?? t('someone');

  const payMethods: Record<string, PayMethod[]> = {};
  for (const m of group.members || []) payMethods[m.user_id] = readPayMethods((m.profile as any)?.pay_methods, (m.profile as any)?.upi_id);

  const expensesWithParts = expenses.filter((e) => e.participants) as (Expense & { participants: ExpenseParticipant[] })[];
  const balances = calculateGroupBalances(expensesWithParts, allPersons, counted);
  const directPlan = directDebts(expensesWithParts, allPersons, counted);
  const settlements = smartSettle(balances, directPlan);
  const myRole = (group.members || []).find((m: any) => m.user_id === user.id)?.role;
  const isAdmin = myRole === 'admin';
  const advanced = advancedPref ?? isAdmin;
  const simplify = !!group.simplify_debts;
  const adminCount = (group.members || []).filter((m: any) => m.role === 'admin').length;

  const stats = tripStats(expensesWithParts, allPersons);
  // "Just track spending": no balances or settle-up (who paid is still saved)
  const trackOnly = !!group.track_only;
  const views: { key: Tab; label: string }[] = [
    { key: 'expenses', label: t('trip.tab.expenses') },
    ...(trackOnly ? [] : [{ key: 'balances' as Tab, label: t('trip.tab.balances') }]),
    ...(advanced ? [{ key: 'stats' as Tab, label: t('trip.tab.stats') }] : []),
  ];
  const view = (trackOnly && tab === 'balances') || (!advanced && (tab === 'stats' || tab === 'activity')) ? 'expenses' : tab;
  const myPaid = stats.paidUpfront.find((p) => p.id === user.id)?.total ?? 0;
  const shown = filterExpenses(expenses, { query, category: catFilter, payer: payerFilter });

  async function setGroupType(patch: { kind?: GroupKind; track_only?: boolean }) {
    const { error } = await createClient().from('groups').update(patch).eq('id', id);
    if (error) toast(error.message, 'error');
    else {
      if (patch.track_only !== undefined) toast(patch.track_only ? 'Now just tracking spending' : 'Splitting and settling up is on');
      refetchGroup();
    }
  }

  async function setCurrency(code: string) {
    const { error } = await createClient().from('groups').update({ currency: code }).eq('id', id);
    if (error) toast(error.message, 'error');
    else { toast(`Amounts now shown in ${code}`); refetchGroup(); }
  }

  // Archiving only tidies the dashboard; balances still count
  async function setArchived(archive: boolean) {
    if (archive && settlements.length > 0 && !trackOnly &&
        !confirm('Some balances are still open. Archive anyway? They will still count in your totals.')) return;
    const { error } = await createClient().from('groups')
      .update({ archived_at: archive ? new Date().toISOString() : null }).eq('id', id);
    if (error) toast(error.message, 'error');
    else { toast(archive ? 'Trip archived' : 'Trip restored'); refetchGroup(); }
  }

  function exportCsv() {
    const csv = expensesCsv(expensesWithParts, allPersons, group!.currency || 'INR');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${group!.name.replace(/[^\w -]/g, '').trim() || 'trip'} expenses.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function toggleSimplify(next: boolean) {
    const { error } = await createClient().from('groups').update({ simplify_debts: next }).eq('id', id);
    if (error) toast(error.message, 'error');
    else { toast(next ? 'Payments simplified for everyone' : 'Back to paying by person'); refetchGroup(); }
  }

  async function setRole(userId: string, role: 'admin' | 'member') {
    const { error } = await createClient().rpc('set_member_role', { p_group_id: id, p_user_id: userId, p_role: role });
    if (error) toast(error.message, 'error');
    else { toast(role === 'admin' ? 'Made admin' : 'Removed as admin'); refetchGroup(); }
  }
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const myBalance = balances.find((b) => b.person_id === user.id);
  const myTotalShare = expensesWithParts.reduce(
    (s, e) => s + Number(e.participants.find((p) => p.user_id === user.id)?.share_amount ?? 0), 0);


  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  async function deletePayment(paymentId: string) {
    if (!confirm('Delete this payment record?')) return;
    const { error } = await createClient().from('settlements').delete().eq('id', paymentId);
    if (error) toast(error.message, 'error');
    else { toast('Payment deleted'); refetchPayments(); changed(); }
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
          // Less-used views live here; the bottom bar's + already adds expenses to this trip
          <div className="flex items-center gap-1">
            {([
              { key: 'members', label: `${t('trip.people')} (${allPersons.length})`, icon: Users, badge: allPersons.length },
              { key: 'activity', label: t('trip.activity'), icon: History, badge: 0 },
            ] as const).filter((b) => advanced || b.key !== 'activity').map(({ key, label, icon: Icon, badge }) => (
              <button
                key={key}
                onClick={() => setTab(tab === key ? 'expenses' : key)}
                aria-label={label}
                aria-pressed={tab === key}
                className={`relative h-10 w-10 inline-flex items-center justify-center rounded-xl transition-colors ${
                  tab === key ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                <Icon size={19} />
                {badge > 0 && (
                  <span className="absolute top-1 right-0.5 min-w-4 h-4 px-1 rounded-full bg-gray-900 text-white text-[10px] font-semibold leading-4 text-center tabular-nums">
                    {badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        }
      />
      {group.archived_at && (
        <div className="mx-4 mt-3 flex items-center justify-between gap-3 rounded-xl bg-gray-100 px-3 py-2 text-sm text-gray-600">
          <span>{t('trip.archived')}</span>
          {isAdmin && <button onClick={() => setArchived(false)} className="font-medium text-blue-600">{t('trip.restore')}</button>}
        </div>
      )}

      {/* Stats */}
      <div className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="flex gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500">{t('trip.total')}</p>
            <p className="font-bold text-gray-900 truncate">{formatCurrency(totalExpenses)}</p>
          </div>
          {trackOnly ? (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">{stats.days > 1 ? t('trip.perDay') : t('trip.expenses')}</p>
                <p className="font-bold text-gray-900 truncate">{stats.days > 1 ? formatCurrency(stats.perDay) : stats.count}</p>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">{t('trip.youPaid')}</p>
                <p className="font-bold text-gray-900 truncate">{formatCurrency(myPaid)}</p>
              </div>
            </>
          ) : (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">{t('trip.myBalance')}</p>
                <p className={`font-bold truncate ${myBalance && myBalance.net_balance >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {myBalance ? (myBalance.net_balance >= 0 ? '+' : '') + formatCurrency(myBalance.net_balance) : '—'}
                </p>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">{t('trip.myShare')}</p>
                <p className="font-bold text-gray-900 truncate">{formatCurrency(myTotalShare)}</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main views: a compact segmented switch (hidden when there's only one) */}
      {views.length > 1 && (
      <div className="bg-white border-b border-gray-100 px-4 py-2">
        <div role="tablist" aria-label="Trip views" className={`grid ${views.length === 3 ? 'grid-cols-3' : 'grid-cols-2'} gap-1 rounded-xl bg-gray-100 p-1`}>
          {views.map(({ key, label }) => (
            <button
              key={key}
              role="tab"
              aria-selected={view === key}
              onClick={() => setTab(key)}
              className={`relative h-9 rounded-lg text-sm font-medium transition-colors ${
                view === key ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {view === key && <motion.span layoutId="trip-tab" transition={spring} className="absolute inset-0 rounded-lg bg-white shadow-sm" />}
              <span className="relative">{label}</span>
            </button>
          ))}
        </div>
      </div>
      )}

      {(tab === 'members' || tab === 'activity') && (
        <div className="px-4 pt-3 -mb-1 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">{tab === 'members' ? t('trip.people') : t('trip.activity')}</h2>
          <button onClick={() => setTab('expenses')} className="text-sm text-blue-600 font-medium">{t('trip.done')}</button>
        </div>
      )}

      <motion.div key={view} {...enter} className="flex-1 p-4 space-y-3">
        <PendingChanges groupId={id} />
        {/* Expenses tab */}
        {view === 'expenses' && (
          expLoading ? (
            <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
          ) : expenses.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title={t('trip.noExpenses')}
              description={t('trip.addFirst')}
              action={<Button onClick={() => setShowAddExpense(true)}><Plus size={16} className="mr-1" /> {t('trip.addExpense')}</Button>}
            />
          ) : (
            <>
              <div className="space-y-2">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t('trip.search')}
                    aria-label={t('trip.search')}
                    className="block w-full min-w-0 h-11 pl-9 pr-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4">
                  <select
                    value={payerFilter ?? ''}
                    onChange={(e) => setPayerFilter(e.target.value || null)}
                    aria-label="Filter by who paid"
                    className={`shrink-0 h-8 rounded-full border px-3 text-sm ${payerFilter ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200'}`}
                  >
                    <option value="">Anyone paid</option>
                    {allPersons.map((p) => <option key={p.id} value={p.id}>{p.id === user.id ? 'You paid' : `${p.name} paid`}</option>)}
                  </select>
                  {[...new Set(expenses.map((e) => categoryOf(e.category).key))].map((k) => {
                    const c = categoryOf(k);
                    return (
                      <button
                        key={k}
                        onClick={() => setCatFilter(catFilter === k ? null : k)}
                        className={`shrink-0 h-8 px-3 rounded-full border text-sm whitespace-nowrap ${catFilter === k ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200'}`}
                      >
                        {c.emoji} {c.label}
                      </button>
                    );
                  })}
                </div>
                {(query || catFilter || payerFilter) && (
                  <p className="text-xs text-gray-500 px-1">
                    {shown.length} of {expenses.length} expenses · {formatCurrency(shown.reduce((s, e) => s + Number(e.amount), 0))}
                    <button onClick={() => { setQuery(''); setCatFilter(null); setPayerFilter(null); }} className="ml-2 text-blue-600 font-medium">Clear</button>
                  </p>
                )}
              </div>
              {shown.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">{t('trip.noMatch')}</p>
              ) : shown.map((expense) => (
                <ExpenseCard
                  key={expense.id}
                  expense={expense}
                  currentUserId={user.id}
                  onDelete={changed}
                  onUpdate={changed}
                  paidBack={paidBack.get(expense.id) ?? EMPTY}
                />
              ))}
              {advanced && <button onClick={exportCsv} className="w-full flex items-center justify-center gap-2 h-10 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700">
                <Download size={15} /> Export expenses (CSV)
              </button>}
            </>
          )
        )}

        {/* Stats tab */}
        {view === 'stats' && <TripStatsPanel stats={stats} me={user.id} />}

        {/* Balances tab */}
        {view === 'balances' && (
          <div className="space-y-4">
            <SettleUpPanel
              balances={balances}
              simplified={settlements}
              byPerson={directPlan}
              simplify={simplify}
              advanced={advanced}
              isAdmin={isAdmin}
              onToggleSimplify={toggleSimplify}
              onOpenPerson={setPersonId}
              currentUserId={user.id}
              groupId={id}
              groupName={group.name}
              payMethods={payMethods}
              onRecorded={() => { refetchPayments(); changed(); }}
            />

            {payments.length > 0 && (
              <Card padding="none">
                <h3 className="font-semibold text-gray-900 px-4 pt-4 pb-2">Payments done ({payments.length})</h3>
                {payments.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 border-t border-gray-50">
                    <span className="text-lg">💸</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 truncate">
                        {nameOf(p.from_person)} → {nameOf(p.to_person)}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{format(new Date(p.date), 'MMM d')}{p.note ? ` · ${p.note}` : ''}</p>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{formatCurrency(p.amount)}</span>
                    <button onClick={() => deletePayment(p.id)} className="p-1.5 text-gray-300 hover:text-red-500">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </Card>
            )}

          </div>
        )}

        {/* Activity tab */}
        {view === 'activity' && (
          <ActivityFeed groupId={id} currentUserId={user.id} nameOf={(pid) => nameOf(pid)} />
        )}

        {/* Members tab */}
        {view === 'members' && (
          <div className="space-y-3">
            <InviteCard inviteCode={group.invite_code} groupName={group.name} />
            {isAdmin && (
              <Card>
                <h3 className="font-semibold text-gray-900 mb-3">Group settings</h3>
                <GroupKindPicker
                  kind={(group.kind as GroupKind) || 'friends'}
                  trackOnly={trackOnly}
                  onKind={(k) => setGroupType({ kind: k })}
                  onTrackOnly={(v) => v !== trackOnly && setGroupType({ track_only: v })}
                />
                <div className="mt-4"><CurrencySelect id="group-currency" value={group.currency || 'INR'} onChange={setCurrency} /></div>
                <p className="text-xs text-gray-500 mt-3">
                  Admins can also make others admin below, and turn on simplified payments in Balances.
                </p>
                <button
                  onClick={() => setArchived(!group.archived_at)}
                  className="mt-4 w-full rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  {group.archived_at ? 'Restore trip' : 'Archive trip'}
                </button>
                {!group.archived_at && <p className="text-xs text-gray-500 mt-2">Trip over? Archiving hides it from your home screen. Nothing is deleted.</p>}
              </Card>
            )}
            <AddPeopleCard
              groupId={id}
              existingNames={allPersons.map((p) => p.name)}
              onAdded={refetchGroup}
            />

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
                      <p className="text-xs text-gray-500 truncate">{p?.email}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${m.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                        {m.role}
                      </span>
                      {isAdmin && m.user_id !== user.id && (m.role === 'member' || adminCount > 1) && (
                        <button
                          onClick={() => setRole(m.user_id, m.role === 'admin' ? 'member' : 'admin')}
                          className="text-xs font-medium text-blue-600"
                        >
                          {m.role === 'admin' ? 'Remove admin' : 'Make admin'}
                        </button>
                      )}
                    </div>
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
                            <p className="font-medium text-gray-900 truncate">{pm.name}</p>
                            <p className="text-xs text-amber-600">Hasn&apos;t joined yet</p>
                          </div>
                          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">pending</span>
                        </div>
                        <div className="mt-2 flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                          <p className="text-xs text-gray-500 flex-1 min-w-0 truncate">{inviteUrl}</p>
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
      </motion.div>

      <PersonSheet
        open={!!personId}
        onClose={() => setPersonId(null)}
        me={user.id}
        other={personId ? allPersons.find((p) => p.id === personId) ?? null : null}
        expenses={expensesWithParts}
        payments={payments}
      />

      <AddExpenseModal
        open={showAddExpense}
        onClose={() => setShowAddExpense(false)}
        groupId={id}
        onSuccess={changed}
      />
    </div>
  );
}
