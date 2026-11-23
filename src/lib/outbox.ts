import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Offline outbox: writes made without signal wait here (localStorage) and are sent, in order,
 * when the phone is back online. Two kinds cover everything people add on a trip.
 */
export type PaymentRow = {
  group_id: string; from_person: string; to_person: string; amount: number;
  date: string; note: string | null; created_by: string; expense_id?: string | null;
};
export type OutboxOp =
  | { id: string; kind: 'expense'; groupId: string; label: string; amount: number; args: Record<string, unknown>; paybacks?: Omit<PaymentRow, 'expense_id'>[] }
  | { id: string; kind: 'payments'; groupId: string; label: string; amount: number; rows: PaymentRow[] };

const KEY = 'tripsplit:outbox:v1';
export const OUTBOX_EVENT = 'tripsplit:outbox';

export function readOutbox(): OutboxOp[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}
function write(ops: OutboxOp[]) {
  try { localStorage.setItem(KEY, JSON.stringify(ops)); } catch {}
  window.dispatchEvent(new Event(OUTBOX_EVENT));
}
type NewOp = Omit<Extract<OutboxOp, { kind: 'expense' }>, 'id'> | Omit<Extract<OutboxOp, { kind: 'payments' }>, 'id'>;
export function enqueue(op: NewOp) {
  write([...readOutbox(), { ...op, id: crypto.randomUUID() } as OutboxOp]);
}
export function clearOutbox() { write([]); }

/** No signal, or the request never reached the server. */
export const isOffline = (error?: { message?: string } | null) =>
  (typeof navigator !== 'undefined' && !navigator.onLine) ||
  /failed to fetch|network|load failed|fetch failed/i.test(error?.message ?? '');

/** Insert payments; without the expense_id migration, save them without it. */
export async function sendPayments(supabase: SupabaseClient, rows: PaymentRow[]) {
  if (!rows.length) return { error: null };
  const res = await supabase.from('settlements').insert(rows);
  if (res.error && /expense_id/.test(res.error.message)) {
    return supabase.from('settlements').insert(rows.map(({ expense_id: _drop, ...r }) => r));
  }
  return res;
}

async function send(supabase: SupabaseClient, op: OutboxOp) {
  if (op.kind === 'payments') return sendPayments(supabase, op.rows);
  const { data, error } = await supabase.rpc('save_expense', op.args);
  if (error || !op.paybacks?.length) return { error };
  // The expense is in: from here on it's just its paybacks, so a retry never adds the expense twice
  const rows = op.paybacks.map((r) => ({ ...r, expense_id: data as string }));
  write(readOutbox().map((o) => (o.id === op.id ? { ...op, kind: 'payments' as const, rows } : o)));
  return sendPayments(supabase, rows);
}

/** Save payments now, or queue them when there's no signal. */
export async function savePayments(supabase: SupabaseClient, rows: PaymentRow[], label: string) {
  const res = navigator.onLine ? await sendPayments(supabase, rows) : { error: { message: 'offline' } };
  if (res.error && isOffline(res.error)) {
    enqueue({ kind: 'payments', groupId: rows[0].group_id, label, amount: rows.reduce((t, r) => t + r.amount, 0), rows });
    return { error: null, queued: true };
  }
  return { error: res.error, queued: false };
}

let flushing = false;
/** Send everything waiting. Stops at the first network failure; drops (and reports) ones the server rejects. */
export async function flushOutbox(supabase: SupabaseClient): Promise<{ sent: number; failed: string[] }> {
  const out = { sent: 0, failed: [] as string[] };
  if (flushing || !navigator.onLine) return out;
  flushing = true;
  try {
    for (const op of readOutbox()) {
      const { error } = await send(supabase, op);
      if (error && isOffline(error)) break;
      if (error) out.failed.push(`${op.label}: ${error.message}`); else out.sent++;
      write(readOutbox().filter((o) => o.id !== op.id));
    }
  } finally {
    flushing = false;
  }
  return out;
}
