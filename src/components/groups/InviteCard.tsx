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

  async function copyCode() {
    await navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function share() {
    const text = `Join me on TripSplit for "${groupName}"! Use invite code: ${inviteCode}`;
    if (navigator.share) {
      await navigator.share({ text });
    } else {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <Card className="bg-blue-50 border-blue-100">
      <p className="text-xs font-medium text-blue-700 mb-2">Invite others</p>
      <div className="flex items-center gap-3">
        <div className="flex-1 bg-white rounded-xl px-4 py-2.5 border border-blue-100">
          <p className="text-lg font-bold tracking-widest text-gray-900 text-center">{inviteCode}</p>
        </div>
        <button
          onClick={copyCode}
          className="p-2.5 bg-white rounded-xl border border-blue-100 text-blue-600 hover:bg-blue-50"
        >
          {copied ? <Check size={18} /> : <Copy size={18} />}
        </button>
        <button
          onClick={share}
          className="p-2.5 bg-blue-600 rounded-xl text-white hover:bg-blue-700"
        >
          <Share2 size={18} />
        </button>
      </div>
    </Card>
  );
}
