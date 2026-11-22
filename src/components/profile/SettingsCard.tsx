'use client';

import { SlidersHorizontal } from 'lucide-react';
import Card from '@/components/ui/Card';
import { useAdvancedPref, setAdvanced } from '@/hooks/useAdvanced';

/** App settings that change what you see (per device). */
export default function SettingsCard() {
  const pref = useAdvancedPref();
  const on = pref ?? false;
  return (
    <Card padding="none">
      <label className="flex items-start gap-3 px-4 py-3 cursor-pointer">
        <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
          <SlidersHorizontal size={16} className="text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">Advanced features</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Stats, activity log, CSV export and %, exact or item-wise splits.
            {pref === null && ' Trip admins see them until you choose here.'}
          </p>
        </div>
        <input
          type="checkbox"
          role="switch"
          checked={on}
          onChange={(e) => setAdvanced(e.target.checked)}
          className="mt-1 h-5 w-9 flex-shrink-0 appearance-none rounded-full bg-gray-300 transition-colors checked:bg-blue-600 relative cursor-pointer before:absolute before:top-0.5 before:left-0.5 before:h-4 before:w-4 before:rounded-full before:bg-white before:transition-transform checked:before:translate-x-4"
        />
      </label>
    </Card>
  );
}
