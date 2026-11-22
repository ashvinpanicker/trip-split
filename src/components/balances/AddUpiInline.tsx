'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { PAY_METHODS, type PayMethod } from '@/lib/utils/payMethods';

/** Shown when people owe you but you have no UPI ID yet: one field, then everyone gets a Pay via UPI button. */
export default function AddUpiInline({ userId, existing, onSaved }: { userId: string; existing: PayMethod[]; onSaved?: () => void }) {
  const { toast } = useToast();
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const upi = PAY_METHODS.upi.clean(value);
    if (!upi) { toast('That doesn’t look like a UPI ID. It looks like name@bank, e.g. ashvin@okaxis', 'error'); return; }
    setSaving(true);
    const next = [{ type: 'upi' as const, value: upi }, ...existing.filter((m) => m.type !== 'upi')].slice(0, 8);
    const { error } = await createClient().from('profiles').update({ pay_methods: next, upi_id: upi }).eq('id', userId);
    setSaving(false);
    if (error) toast(error.message, 'error');
    else { toast('UPI ID saved. Friends now get a Pay via UPI button.'); onSaved?.(); }
  }

  return (
    <form onSubmit={save} className="rounded-xl border border-blue-100 bg-blue-50 p-3 space-y-2">
      <p className="text-sm font-medium text-gray-900">Get paid in one tap</p>
      <p className="text-xs text-gray-600">Add your UPI ID (find it in GPay, PhonePe or Paytm under your profile).</p>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="yourname@okaxis"
          aria-label="Your UPI ID"
          autoCapitalize="none"
          autoCorrect="off"
          className="flex-1 min-w-0 h-10 rounded-lg border border-gray-200 bg-white px-3 text-gray-900"
        />
        <button disabled={saving} className="h-10 px-4 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-50">
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  );
}
