'use client';

import { useState } from 'react';
import { Plus, Trash2, Wallet } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/Toast';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { PAY_METHODS, PAY_METHOD_ORDER, readPayMethods, type PayMethod, type PayMethodType } from '@/lib/utils/payMethods';

/** "How friends can pay you": UPI, PayPal, Revolut, crypto… up to 8 methods. */
export default function PayMethodsEditor({ userId, initial, legacyUpi }: { userId: string; initial: unknown; legacyUpi?: string | null }) {
  const supabase = createClient();
  const { toast } = useToast();
  const [methods, setMethods] = useState<PayMethod[]>(() => readPayMethods(initial, legacyUpi));
  // UPI first; PayPal, Wise, crypto and the rest one tap away (shown straight away if they already use one)
  const [more, setMore] = useState(() => methods.some((m) => m.type !== 'upi'));
  const [type, setType] = useState<PayMethodType>('upi');
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  async function save(next: PayMethod[]) {
    setSaving(true);
    const upi = next.find((m) => m.type === 'upi')?.value ?? null;
    const { error } = await supabase.from('profiles').update({ pay_methods: next, upi_id: upi }).eq('id', userId);
    setSaving(false);
    if (error) {
      toast(error.message.includes('pay_methods') ? 'Run supabase/pay_methods.sql first' : error.message, 'error');
      return false;
    }
    setMethods(next);
    return true;
  }

  async function add() {
    const def = PAY_METHODS[type];
    const clean = def.clean(value);
    if (!clean) return toast(`That doesn’t look right for ${def.label}. Example: ${def.placeholder}`, 'error');
    if (methods.length >= 8) return toast('You can add up to 8 ways to pay', 'error');
    if (methods.some((m) => m.type === type && m.value === clean)) return toast('Already added');
    if (await save([...methods, { type, value: clean }])) {
      setValue('');
      toast(`${def.label} added`);
    }
  }

  async function remove(i: number) {
    if (await save(methods.filter((_, j) => j !== i))) toast('Removed');
  }

  const def = PAY_METHODS[type];

  return (
    <Card>
      <div className="flex items-center gap-2 mb-1">
        <Wallet size={16} className="text-blue-600" />
        <p className="text-sm font-semibold text-gray-900">How friends can pay you</p>
      </div>
      <p className="text-xs text-gray-500 mb-3">
        Friends who owe you get a pay button for each of these, with the amount filled in where the app allows. TripSplit never touches the money.
      </p>

      {methods.length > 0 && (
        <ul className="divide-y divide-gray-100 border border-gray-100 rounded-xl mb-3">
          {methods.map((m, i) => (
            <li key={`${m.type}-${m.value}`} className="flex items-center gap-3 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-500">{PAY_METHODS[m.type].label}</p>
                <p className="text-sm text-gray-900 truncate">{m.value}</p>
              </div>
              <button onClick={() => remove(i)} disabled={saving} aria-label={`Remove ${PAY_METHODS[m.type].label}`} className="p-2 text-gray-400 hover:text-red-500">
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-2">
        <select
          value={type}
          onChange={(e) => setType(e.target.value as PayMethodType)}
          className="w-full h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900"
          aria-label="Payment method"
        >
          {(more ? PAY_METHOD_ORDER : (['upi'] as PayMethodType[])).map((t) => (
            <option key={t} value={t}>{PAY_METHODS[t].label}</option>
          ))}
        </select>
        <div className="flex gap-2">
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            placeholder={def.placeholder}
            aria-label={`${def.label}: ${def.hint}`}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="flex-1 min-w-0 h-11 rounded-xl border border-gray-200 px-3 text-sm text-gray-900"
          />
          <Button onClick={add} loading={saving} disabled={!value.trim()}>
            <Plus size={16} className="mr-1" /> Add
          </Button>
        </div>
        <p className="text-xs text-gray-400">{def.hint}</p>
        {!more && (
          <button type="button" onClick={() => setMore(true)} className="text-xs font-medium text-blue-600">
            Paid outside India? Add PayPal, Wise, Revolut or others
          </button>
        )}
      </div>
    </Card>
  );
}
