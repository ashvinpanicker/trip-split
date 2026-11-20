'use client';

import { GROUP_KINDS, type GroupKind } from '@/lib/utils/groupKinds';

/** Group type chips plus the "split and settle up" switch. */
export default function GroupKindPicker({
  kind, trackOnly, onKind, onTrackOnly,
}: { kind: GroupKind; trackOnly: boolean; onKind: (k: GroupKind) => void; onTrackOnly: (v: boolean) => void }) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-700 mb-1.5">What kind of group?</p>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Group type">
        {GROUP_KINDS.map((g) => (
          <button
            key={g.key}
            type="button"
            role="radio"
            aria-checked={kind === g.key}
            onClick={() => { onKind(g.key); onTrackOnly(g.trackOnly); }}
            className={`px-3 py-1.5 rounded-full border text-sm ${kind === g.key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200'}`}
          >
            {g.emoji} {g.label}
          </button>
        ))}
      </div>
      <label className="mt-3 flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3 cursor-pointer">
        <input type="checkbox" className="mt-0.5 h-4 w-4 accent-blue-600" checked={!trackOnly} onChange={(e) => onTrackOnly(!e.target.checked)} />
        <span>
          <span className="block text-sm font-medium text-gray-900">Split costs and settle up</span>
          <span className="block text-xs text-gray-500">
            {trackOnly
              ? 'Off: just track what the group spends. Who paid is still saved, so you can turn this on later.'
              : 'On: see who owes whom and settle up in the fewest payments.'}
          </span>
        </span>
      </label>
    </div>
  );
}
