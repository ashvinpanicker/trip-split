'use client';

import { useState } from 'react';
import { AUTHOR, SUPPORT, hasSupport } from '@/lib/marketing/site';

const TIPS = [
  { icon: '₹', label: 'UPI ID', value: SUPPORT.upi },
  { icon: '₿', label: 'BTC address', value: SUPPORT.btc },
  { icon: '₮', sub: 'T', label: 'USDT (TRC-20) address', value: SUPPORT.usdtTrc20 },
  { icon: '₮', sub: 'E', label: 'USDT (ERC-20) address', value: SUPPORT.usdtErc20 },
].filter((t) => t.value);

/** "Built by" signature plus tiny tip icons that copy an address. */
export default function SupportLinks({ className = '' }: { className?: string }) {
  const [copied, setCopied] = useState('');

  async function copy(label: string, value: string) {
    let ok = false;
    try {
      await navigator.clipboard.writeText(value);
      ok = true;
    } catch {
      // Older browsers / in-app webviews: fall back to a hidden textarea
      const ta = document.createElement('textarea');
      ta.value = value;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      try { ok = document.execCommand('copy'); } catch {}
      ta.remove();
    }
    // If copying is blocked entirely, show the address so it can be copied by hand
    setCopied(ok ? `Copied ${label}` : `${label}: ${value}`);
    setTimeout(() => setCopied(''), ok ? 1800 : 15000);
  }

  return (
    <div className={className}>
      <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
        <span>
          Vibecoded by <a href={AUTHOR.url} className="underline underline-offset-4" rel="noopener">{AUTHOR.name}</a> with Claude
          {hasSupport && ' · Buy me a coffee ☕'}
        </span>
        {TIPS.map((t) => (
          <button
            key={t.label}
            type="button"
            onClick={() => copy(t.label, t.value)}
            title={`Copy ${t.label}`}
            aria-label={`Copy ${t.label}`}
            className="relative inline-flex h-6 w-6 items-center justify-center rounded-full border border-current/25 text-xs font-semibold leading-none opacity-80 hover:opacity-100"
          >
            {t.icon}
            {t.sub && <span className="absolute -bottom-0.5 -right-0.5 text-[8px] font-bold">{t.sub}</span>}
          </button>
        ))}
        {copied && <span role="status" className="text-xs opacity-80 break-all select-all">{copied}</span>}
      </p>
    </div>
  );
}
