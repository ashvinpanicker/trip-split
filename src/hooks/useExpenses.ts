'use client';

import { EXPENSE_SELECT, fetchExpenses, fetchPayments } from '@/lib/data/trip';
import { useEffect, useState, useCallback } from 'react';
import { createClient, getAuthUser } from '@/lib/supabase/client';
import type { Expense, ExpenseParticipant, SettlementRecord } from '@/types';
import { useCachedState, hasCached, useRefreshOn } from './cache';

export function useExpenses(groupId: string) {
  const [expenses, setExpenses] = useCachedState<Expense[]>(`expenses:${groupId}`, []);
  const [loading, setLoading] = useState(!hasCached(`expenses:${groupId}`));
  const supabase = createClient();

  const load = useCallback(async () => {
    if (!hasCached(`expenses:${groupId}`)) setLoading(true);
    const fresh = await fetchExpenses(supabase, groupId);
    if (fresh) setExpenses(fresh); // offline: keep what's saved
    setLoading(false);
  }, [groupId]);
  useRefreshOn(load);

  useEffect(() => {
    load();
    const onChange = () => load();
    window.addEventListener('tripsplit:expenses-changed', onChange);
    window.addEventListener('tripsplit:refresh', onChange);
    return () => { window.removeEventListener('tripsplit:expenses-changed', onChange); window.removeEventListener('tripsplit:refresh', onChange); };
  }, [load]);

  return { expenses, loading, refetch: load };
}

export function useAllExpenses() {
  const [expenses, setExpenses] = useCachedState<Expense[]>('expenses:all', []);
  const [loading, setLoading] = useState(!hasCached('expenses:all'));
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const user = await getAuthUser(supabase);
      if (!user) { setLoading(false); return; }

      // Get all groups user belongs to
      const { data: memberships } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id);

      if (!memberships?.length) { setLoading(false); return; } // offline lands here too: keep what's saved

      const groupIds = memberships.map((m) => m.group_id);

      const { data, error } = await supabase
        .from('expenses')
        .select(EXPENSE_SELECT)
        .in('group_id', groupIds)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error) setExpenses((data || []) as Expense[]); // offline: keep what's saved
      setLoading(false);
    }
    load();
    const onChange = () => load();
    window.addEventListener('tripsplit:expenses-changed', onChange);
    window.addEventListener('tripsplit:refresh', onChange);
    return () => { window.removeEventListener('tripsplit:expenses-changed', onChange); window.removeEventListener('tripsplit:refresh', onChange); };
  }, []);

  return { expenses, loading };
}

export function useSettlements(groupId: string) {
  const [settlements, setSettlements] = useCachedState<SettlementRecord[]>(`payments:${groupId}`, []);
  const supabase = createClient();

  const load = useCallback(async () => {
    const fresh = await fetchPayments(supabase, groupId);
    if (fresh) setSettlements(fresh); // offline: keep what's saved
  }, [groupId]);
  useRefreshOn(load);

  useEffect(() => { load(); }, [load]);
  // Expenses can carry payments ("paid on the spot", deleted along with the expense)
  useEffect(() => {
    window.addEventListener('tripsplit:expenses-changed', load);
    return () => window.removeEventListener('tripsplit:expenses-changed', load);
  }, [load]);

  return { settlements, refetch: load };
}

/** Everything needed for my totals across all groups — no row limit, minimal columns. */
type TotalsExpense = Pick<Expense, 'id' | 'group_id' | 'paid_by' | 'paid_by_pending' | 'date'> & {
  participants: Pick<ExpenseParticipant, 'user_id' | 'pending_member_id' | 'share_amount'>[];
};

export function useMyTotals() {
  const [data, setData] = useCachedState<{ expenses: TotalsExpense[]; payments: SettlementRecord[] }>('totals', { expenses: [], payments: [] });
  const [loading, setLoading] = useState(!hasCached('totals'));
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const [{ data: expenses }, { data: payments }] = await Promise.all([
        supabase.from('expenses').select('id, group_id, date, paid_by, paid_by_pending, participants:expense_participants(user_id, pending_member_id, share_amount)'),
        supabase.from('settlements').select('group_id, from_person, to_person, amount'),
      ]);
      if (expenses) setData({ expenses: expenses as unknown as TotalsExpense[], payments: (payments || []) as SettlementRecord[] });
      setLoading(false);
    }
    load();
    const onChange = () => load();
    window.addEventListener('tripsplit:expenses-changed', onChange);
    window.addEventListener('tripsplit:refresh', onChange);
    return () => { window.removeEventListener('tripsplit:expenses-changed', onChange); window.removeEventListener('tripsplit:refresh', onChange); };
  }, []);

  return { ...data, loading };
}
