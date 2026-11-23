import { demoDirect, demoExpenses, demoSmart, demoTotal } from '@/lib/marketing/demo';
import { formatCurrency } from '@/lib/utils/balance';

const inr = (n: number) => formatCurrency(n).replace('.00', '');

/** Tally marks in groups of five, as you'd keep them in an account book. */
function Tally({ count }: { count: number }) {
  const groups = Array.from({ length: Math.ceil(count / 5) }, (_, g) => Math.min(5, count - g * 5));
  return (
    <span aria-hidden className="flex gap-2.5">
      {groups.map((n, g) => (
        <svg key={g} width={n === 5 ? 26 : n * 5 + 2} height="18" viewBox={`0 0 ${n === 5 ? 26 : n * 5 + 2} 18`} className="text-[var(--ink)]">
          {Array.from({ length: Math.min(n, 4) }, (_, i) => (
            <line key={i} x1={3 + i * 5} y1="2" x2={3 + i * 5} y2="16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          ))}
          {n === 5 && <line x1="0" y1="14" x2="22" y2="4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />}
        </svg>
      ))}
    </span>
  );
}

export default function LedgerDemo() {
  return (
    <figure className="ledger w-full max-w-md mx-auto lg:mx-0 py-[1.175rem] text-[0.95rem]" aria-label="Example: settling a Goa weekend for six friends">
      <div className="ledger-row justify-between">
        <span className="font-bold text-[1.05rem]">Goa weekend</span>
        <span className="num text-[var(--ink-soft)]">{inr(demoTotal)} spent</span>
      </div>
      <div className="ledger-row text-[var(--ink-soft)]">6 friends, {demoExpenses.length} expenses</div>

      <div className="ledger-row strike justify-between" style={{ ['--d' as string]: '0.6s' }}>
        <span>Pay everyone back</span>
        <span className="flex items-center gap-2 text-[var(--ink-soft)]">
          <Tally count={demoDirect.length} />
          <span className="num">{demoDirect.length}</span>
        </span>
      </div>

      <div className="ledger-row land justify-between font-semibold" style={{ ['--d' as string]: '1s' }}>
        <span className="text-[var(--blue)]">Smart settle</span>
        <span className="flex items-center gap-2 text-[var(--blue)]">
          <Tally count={demoSmart.length} />
          <span className="num">{demoSmart.length}</span>
        </span>
      </div>

      <ol aria-label="Smart settle-up plan">
        {demoSmart.map((s, i) => (
          <li key={s.from_id + s.to_id} className="ledger-row land justify-between" style={{ ['--d' as string]: `${1.2 + i * 0.12}s` }}>
            <span>
              <span className="font-medium">{s.from_name}</span>
              <span className="text-[var(--ink-soft)]"> pays </span>
              <span className="font-medium">{s.to_name}</span>
            </span>
            <span className="num font-semibold">{inr(s.amount)}</span>
          </li>
        ))}
      </ol>
      <figcaption className="ledger-row land text-[var(--gain)] font-medium" style={{ ['--d' as string]: `${1.3 + demoSmart.length * 0.12}s` }}>
        Everyone square, to the paisa.
      </figcaption>
    </figure>
  );
}
