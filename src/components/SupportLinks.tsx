'use client';

import { useState } from 'react';
import { AUTHOR, SUPPORT, hasSupport } from '@/lib/marketing/site';

const pill = 'inline-flex items-center gap-1.5 h-9 px-3 rounded-full border border-current/20 font-medium';

function CopyButton({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={pill}
      title={value}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          prompt('Copy this:', value);
        }
      }}
    >
      {copied ? '✓ Copied' : label}
    </button>
  );
}

/** "Built by" signature plus tip links. Renders only the ones that are configured. */
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
          {upi && <a href={upi} className={pill}>☕ Tip via UPI</a>}
          {SUPPORT.upi && <CopyButton label={`Copy UPI ID`} value={SUPPORT.upi} />}
          {SUPPORT.coffee && <a href={SUPPORT.coffee} rel="noopener" className={pill}>☕ Buy me a coffee</a>}
          {SUPPORT.lightning && <a href={`lightning:${SUPPORT.lightning}`} className={pill} title={SUPPORT.lightning}>⚡ Tip in sats</a>}
          {SUPPORT.btc && <CopyButton label="₿ Copy BTC address" value={SUPPORT.btc} />}
          {SUPPORT.usdt && (
            <CopyButton label={`💵 Copy USDT address${SUPPORT.usdtNetwork ? ` (${SUPPORT.usdtNetwork})` : ''}`} value={SUPPORT.usdt} />
          )}
        </div>
      )}
    </div>
  );
}
