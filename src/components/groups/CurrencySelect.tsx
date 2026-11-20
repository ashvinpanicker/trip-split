import { CURRENCIES, currencySymbol } from '@/lib/utils/balance';

/** Pick the symbol a trip's amounts are shown in. No conversion happens. */
export default function CurrencySelect({ value, onChange, id = 'currency' }: { value: string; onChange: (code: string) => void; id?: string }) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <label htmlFor={id} className="text-sm font-medium text-gray-700">Currency</label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full min-w-0 h-11 rounded-xl border border-gray-200 bg-white px-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {CURRENCIES.map((c) => (
          <option key={c.code} value={c.code}>{currencySymbol(c.code)}  {c.label} ({c.code})</option>
        ))}
      </select>
      <p className="text-xs text-gray-500">Only changes the symbol shown. Amounts aren’t converted.</p>
    </div>
  );
}
