'use client';

import { useState } from 'react';
import { Copy, Check, Share2 } from 'lucide-react';
import Card from '@/components/ui/Card';

interface InviteCardProps {
  inviteCode: string;
  groupName: string;
}

export default function InviteCard({ inviteCode, groupName }: InviteCardProps) {
  const [copied, setCopied] = useState(false);
  // Simple for most friends; Full for the ones who'll want splits by item, stats and the activity log
  const [mode, setMode] = useState<'simple' | 'full'>('simple');

  const link = typeof window !== 'undefined' ? `${window.location.origin}/join/${inviteCode}?app=${mode}` : '';

  async function copyCode() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function share() {
    const text = `Splitting ${groupName} expenses on TripSplit — tap to join and pick your name:\n${link}`;
    if (navigator.share) {
      await navigator.share({ text }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <Card className="bg-blue-50 border-blue-100">
      <p className="text-xs font-medium text-blue-700 mb-2">One link for the whole group — drop it in WhatsApp</p>
      <div role="radiogroup" aria-label="App for people who join" className="grid grid-cols-2 gap-1 rounded-xl bg-white/70 p-1 mb-2">
        {([['simple', 'Simple app'], ['full', 'Full app']] as const).map(([key, label]) => (
          <button
            key={key}
            role="radio"
            aria-checked={mode === key}
            onClick={() => setMode(key)}
            className={`h-8 rounded-lg text-sm font-medium ${mode === key ? 'bg-blue-600 text-white' : 'text-blue-700'}`}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="text-xs text-blue-700/80 mb-2">
        {mode === 'simple'
          ? 'Just add a bill and see what you owe. Best for most friends.'
          : 'Adds item and % splits, the activity log and more. They can switch any time in Settings.'}
      </p>
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0 bg-white rounded-xl px-3 py-2.5 border border-blue-100">
          <p className="text-sm font-medium text-gray-900 truncate">{link.replace(/^https?:\/\//, '')}</p>
        </div>
        <button
          onClick={copyCode}
          className="shrink-0 p-2.5 bg-white rounded-xl border border-blue-100 text-blue-600 hover:bg-blue-50"
        >
          {copied ? <Check size={18} /> : <Copy size={18} />}
        </button>
        <button
          onClick={share}
          className="shrink-0 p-2.5 bg-blue-600 rounded-xl text-white hover:bg-blue-700"
        >
          <Share2 size={18} />
        </button>
      </div>
      <a
        href={`https://wa.me/?text=${encodeURIComponent(`Splitting ${groupName} expenses on TripSplit — tap to join and pick your name:\n${link}`)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 flex items-center justify-center gap-2 h-10 rounded-xl bg-[#25D366] text-white text-sm font-semibold"
      >
        Share on WhatsApp
      </a>
    </Card>
  );
}
