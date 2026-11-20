'use client';

import { Plus, X } from 'lucide-react';
import { formatCurrency, itemizedShares } from '@/lib/utils/balance';

export type DraftItem = { name: string; price: string; people: string[] };
export type DraftBill = { items: DraftItem[]; extra: string };

interface ItemizedEditorProps {
  people: { id: string; name: string }[];
  bill: DraftBill;
  onChange: (bill: DraftBill) => void;
  currency: string;
  symbol: string;
}

const input = 'block w-full min-w-0 h-10 rounded-lg border border-gray-200 bg-white px-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500';

/** Split a bill item by item: tap who had each thing; tax / service / tip is spread fairly. */
export default function ItemizedEditor({ people, bill, onChange, currency, symbol }: ItemizedEditorProps) {
  const setItem = (i: number, patch: Partial<DraftItem>) =>
    onChange({ ...bill, items: bill.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) });
  const toggle = (i: number, id: string) => {
    const has = bill.items[i].people.includes(id);
    setItem(i, { people: has ? bill.items[i].people.filter((p) => p !== id) : [...bill.items[i].people, id] });
  };
  const subtotal = bill.items.reduce((s, it) => s + (parseFloat(it.price) || 0), 0);
  const { shares, total } = itemizedShares(
    bill.items.map((it) => ({ name: it.name, price: parseFloat(it.price) || 0, people: it.people })),
    parseFloat(bill.extra) || 0
  );
  const first = (n: string) => n.split(' ')[0];

  return (
    <div className="space-y-3">
      {bill.items.map((it, i) => (
        <div key={i} className="rounded-xl border border-gray-100 bg-gray-50 p-3 space-y-2">
          <div className="flex gap-2">
            <input className={input} placeholder={`Item ${i + 1}, e.g. Fish thali`} value={it.name} onChange={(e) => setItem(i, { name: e.target.value })} aria-label={`Item ${i + 1} name`} />
            <div className="relative w-28 shrink-0">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-gray-500">{symbol}</span>
              <input className={`${input} pl-7`} inputMode="decimal" type="number" placeholder="0" value={it.price} onChange={(e) => setItem(i, { price: e.target.value })} aria-label={`Item ${i + 1} price`} />
            </div>
            {bill.items.length > 1 && (
              <button type="button" onClick={() => onChange({ ...bill, items: bill.items.filter((_, j) => j !== i) })} className="shrink-0 p-2 text-gray-400" aria-label={`Remove item ${i + 1}`}>
                <X size={16} />
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label={`Who had item ${i + 1}`}>
            {people.map((p) => {
              const on = it.people.includes(p.id);
              return (
                <button key={p.id} type="button" onClick={() => toggle(i, p.id)}
                  className={`h-7 px-2.5 rounded-full border text-xs font-medium ${on ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'}`}>
                  {first(p.name)}
                </button>
              );
            })}
            <button type="button" onClick={() => setItem(i, { people: it.people.length === people.length ? [] : people.map((p) => p.id) })}
              className="h-7 px-2 text-xs font-medium text-blue-600">
              {it.people.length === people.length ? 'None' : 'Everyone'}
            </button>
          </div>
        </div>
      ))}

      <button type="button" onClick={() => onChange({ ...bill, items: [...bill.items, { name: '', price: '', people: people.map((p) => p.id) }] })}
        className="w-full flex items-center justify-center gap-1.5 h-10 rounded-xl border-2 border-dashed border-gray-200 text-sm font-medium text-gray-600">
        <Plus size={15} /> Add item
      </button>

      <div className="rounded-xl border border-gray-100 p-3 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="bill-extra" className="text-sm text-gray-700">Tax, service, tip</label>
          <div className="relative w-28">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-gray-500">{symbol}</span>
            <input id="bill-extra" className={`${input} pl-7`} inputMode="decimal" type="number" placeholder="0" value={bill.extra} onChange={(e) => onChange({ ...bill, extra: e.target.value })} />
          </div>
        </div>
        <div className="flex gap-1.5 justify-end">
          {[5, 10, 18].map((pct) => (
            <button key={pct} type="button" onClick={() => onChange({ ...bill, extra: (Math.round(subtotal * pct) / 100).toFixed(2) })}
              className="h-7 px-2.5 rounded-full border border-gray-200 bg-white text-xs font-medium text-gray-600">+{pct}%</button>
          ))}
        </div>
        <p className="text-xs text-gray-500">Spread in proportion to what each person ordered. Use a negative number for a discount.</p>
      </div>

      {Object.keys(shares).length > 0 && (
        <div className="rounded-xl bg-blue-50 p-3">
          <div className="flex justify-between text-sm font-semibold text-gray-900 mb-1.5">
            <span>Bill total</span><span className="tabular-nums">{formatCurrency(total, currency)}</span>
          </div>
          <div className="space-y-1">
            {people.filter((p) => shares[p.id] !== undefined).map((p) => (
              <div key={p.id} className="flex justify-between text-sm text-gray-700">
                <span>{p.name}</span><span className="tabular-nums">{formatCurrency(shares[p.id], currency)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
