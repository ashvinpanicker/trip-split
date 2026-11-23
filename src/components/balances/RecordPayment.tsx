'use client';

import { useState } from 'react';
import { HandCoins } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { savePayments } from '@/lib/outbox';
import { useToast } from '@/components/ui/Toast';
import { currencySymbol, getActiveCurrency } from '@/lib/utils/balance';

type Person = { id: string; name: string };

/**
 * Record any payment between two people: a partial payment, cash, an advance into the kitty,
 * or someone paying you back before the expense was even added. Balances just use it:
 * the expense stays as it was; what they paid comes off what they owe.
 */
export default function RecordPayment({ persons, groupId, currentUserId, onRecorded }: {
  persons: Person[]; groupId: string; currentUserId: string; onRecorded: () => void;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const others = persons.filter((p) => p.id !== currentUserId);
  const [from, setFrom] = useState(others[0]?.id ?? '');
  const [to, setTo] = useState(currentUserId);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const sym = currencySymbol(getActiveCurrency());

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const value = Math.round(parseFloat(amount) * 100) / 100;
    if (!(value > 0)) { toast('Enter an amount', 'error'); return; }
    if (!from || !to || from === to) { toast('Pick two different people', 'error'); return; }
    setSaving(true);
    const { error, queued } = await savePayments(createClient(), [{
      group_id: groupId, from_person: from, to_person: to, amount: value, date,
      note: note.trim().slice(0, 200) || null, created_by: currentUserId,
    }], 'Payment');
    setSaving(false);
    if (error) { toast(error.message, 'error'); return; }
    toast(queued ? 'No signal. It’ll sync when you’re back online.' : 'Payment recorded');
    setAmount(''); setNote(''); setOpen(false);
    onRecorded();
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="flex items-center justify-center gap-1.5 w-full text-sm font-medium text-blue-600">
        <HandCoins size={15} /> Record a payment (any amount)
      </button>
    );
  }

  const select = 'h-10 w-full rounded-lg border border-gray-200 bg-white px-2 text-sm text-gray-900';
  return (
    <form onSubmit={save} className="rounded-xl border border-gray-200 bg-white p-3 space-y-3">
      <p className="text-sm font-semibold text-gray-900">Record a payment</p>
      <p className="text-xs text-gray-500">
        Paid back part, paid in cash, or paid before the expense was added? Record it here. Don’t edit the expense:
        the payment comes off what they owe.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-gray-600">Who paid
          <select value={from} onChange={(e) => setFrom(e.target.value)} className={select}>
            {persons.map((p) => <option key={p.id} value={p.id}>{p.id === currentUserId ? 'You' : p.name}</option>)}
          </select>
        </label>
        <label className="text-xs text-gray-600">To
          <select value={to} onChange={(e) => setTo(e.target.value)} className={select}>
            {persons.map((p) => <option key={p.id} value={p.id}>{p.id === currentUserId ? 'You' : p.name}</option>)}
          </select>
        </label>
        <label className="text-xs text-gray-600">Amount ({sym})
          <input type="number" inputMode="decimal" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} className={select} required />
        </label>
        <label className="text-xs text-gray-600">Date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={select} />
        </label>
      </div>
      <input placeholder="Note (optional), e.g. cash at the airport" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} className={select} />
      <div className="flex gap-2">
        <button disabled={saving} className="flex-1 h-10 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-60">{saving ? 'Saving…' : 'Save payment'}</button>
        <button type="button" onClick={() => setOpen(false)} className="h-10 px-4 rounded-lg border border-gray-200 bg-white text-sm text-gray-700">Cancel</button>
      </div>
    </form>
  );
}
