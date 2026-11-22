'use client';

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
    const { data } = await supabase
      .from('expenses')
      .select(`
        *,
        payer:profiles!expenses_paid_by_fkey(id, email, full_name, avatar_url, upi_id),
        payer_pending:pending_members!expenses_paid_by_pending_fkey(id, name),
        participants:expense_participants(
          id, user_id, pending_member_id, share_amount, share_percentage,
          profile:profiles(id, email, full_name, avatar_url),
          pending_member:pending_members(id, name)
        )
      `)
      .eq('group_id', groupId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    setExpenses((data || []) as Expense[]);
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

      if (!memberships?.length) { setLoading(false); return; }

      const groupIds = memberships.map((m) => m.group_id);

      const { data } = await supabase
        .from('expenses')
        .select(`
          *,
          payer:profiles!expenses_paid_by_fkey(id, email, full_name, avatar_url),
          payer_pending:pending_members!expenses_paid_by_pending_fkey(id, name),
          participants:expense_participants(
            id, user_id, pending_member_id, share_amount, share_percentage,
            profile:profiles(id, email, full_name, avatar_url),
            pending_member:pending_members(id, name)
          )
        `)
        .in('group_id', groupIds)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(50);

      setExpenses((data || []) as Expense[]);
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
    const { data, error } = await supabase
      .from('settlements')
      .select('*')
      .eq('group_id', groupId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });
    // Table missing (migration not run yet) → behave as "no payments recorded"
    setSettlements(error ? [] : ((data || []) as SettlementRecord[]));
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
type TotalsExpense = Pick<Expense, 'id' | 'group_id' | 'paid_by' | 'paid_by_pending'> & {
  participants: Pick<ExpenseParticipant, 'user_id' | 'pending_member_id' | 'share_amount'>[];
};

export function useMyTotals() {
  const [data, setData] = useCachedState<{ expenses: TotalsExpense[]; payments: SettlementRecord[] }>('totals', { expenses: [], payments: [] });
  const [loading, setLoading] = useState(!hasCached('totals'));
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const [{ data: expenses }, { data: payments }] = await Promise.all([
        supabase.from('expenses').select('id, group_id, paid_by, paid_by_pending, participants:expense_participants(user_id, pending_member_id, share_amount)'),
        supabase.from('settlements').select('group_id, from_person, to_person, amount'),
      ]);
      setData({ expenses: (expenses || []) as unknown as TotalsExpense[], payments: (payments || []) as SettlementRecord[] });
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
