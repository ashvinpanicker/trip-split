import type { SupabaseClient } from '@supabase/supabase-js';
import type { Expense, Group, SettlementRecord } from '@/types';

/**
 * The reads behind a trip page. Each returns null when the read fails (no signal),
 * so callers keep what's saved on the phone instead of replacing it with nothing.
 */
export async function fetchGroup(supabase: SupabaseClient, groupId: string): Promise<Group | null> {
  const [{ data, error }, { data: pending }] = await Promise.all([
    supabase.from('groups')
      .select('*, members:group_members(*, profile:profiles(id, email, full_name, avatar_url, upi_id, pay_methods))')
      .eq('id', groupId).single(),
    supabase.from('pending_members').select('*').eq('group_id', groupId),
  ]);
  return error || !data ? null : ({ ...data, pending_members: pending ?? [] } as Group);
}

export const EXPENSE_SELECT = `
  *,
  payer:profiles!expenses_paid_by_fkey(id, email, full_name, avatar_url, upi_id),
  payer_pending:pending_members!expenses_paid_by_pending_fkey(id, name),
  participants:expense_participants(
    id, user_id, pending_member_id, share_amount, share_percentage,
    profile:profiles(id, email, full_name, avatar_url),
    pending_member:pending_members(id, name)
  )`;

export async function fetchExpenses(supabase: SupabaseClient, groupId: string): Promise<Expense[] | null> {
  const { data, error } = await supabase.from('expenses').select(EXPENSE_SELECT)
    .eq('group_id', groupId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });
  return error ? null : ((data ?? []) as Expense[]);
}

export async function fetchPayments(supabase: SupabaseClient, groupId: string): Promise<SettlementRecord[] | null> {
  const { data, error } = await supabase.from('settlements').select('*')
    .eq('group_id', groupId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });
  return error ? null : ((data ?? []) as SettlementRecord[]);
}
