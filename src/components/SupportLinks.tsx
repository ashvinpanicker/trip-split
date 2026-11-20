import { AUTHOR, SUPPORT, hasSupport } from '@/lib/marketing/site';

/** "Built by" signature plus optional tip links. Renders only the links that are configured. */
export default function SupportLinks({ className = '' }: { className?: string }) {
  const upi = SUPPORT.upi
    ? `upi://pay?${new URLSearchParams({ pa: SUPPORT.upi, pn: AUTHOR.name, cu: 'INR', tn: 'TripSplit tip' })}`
    : '';
  return (
    <div className={className}>
      <p>
        Built by <a href={AUTHOR.url} className="underline underline-offset-4" rel="noopener">{AUTHOR.name}</a>.
        {hasSupport && ' Tips help pay for the domain and hosting.'}
      </p>
      {hasSupport && (
        <div className="mt-2 flex flex-wrap gap-2">
          {upi && <a href={upi} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full border border-current/20 font-medium">☕ Tip via UPI</a>}
          {SUPPORT.coffee && <a href={SUPPORT.coffee} rel="noopener" className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full border border-current/20 font-medium">☕ Buy me a coffee</a>}
          {SUPPORT.lightning && (
            <a href={`lightning:${SUPPORT.lightning}`} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full border border-current/20 font-medium" title={SUPPORT.lightning}>
              ⚡ Tip in sats
            </a>
          )}
        </div>
      )}
    </div>
  );
}
