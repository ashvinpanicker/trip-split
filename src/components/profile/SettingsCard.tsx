'use client';

import { Languages, Moon, SlidersHorizontal } from 'lucide-react';
import { useTheme, type Theme } from '@/lib/theme';
import { useT, setLang, LANGS, type Lang } from '@/lib/i18n';
import Card from '@/components/ui/Card';
import { useAdvancedPref, setAdvanced } from '@/hooks/useAdvanced';

/** App settings that change what you see (per device). */
export default function SettingsCard() {
  const pref = useAdvancedPref();
  const on = pref ?? false;
  const t = useT();
  const { theme, setTheme } = useTheme();
  return (
    <Card padding="none">
      <label className="flex items-start gap-3 px-4 py-3 cursor-pointer">
        <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
          <SlidersHorizontal size={16} className="text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">{t('settings.advanced')}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {t('settings.advancedHint')}
            {pref === null && t('settings.adminsDefault')}
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
      <div className="flex items-center gap-3 px-4 py-3 border-t border-gray-50">
        <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
          <Languages size={16} className="text-blue-600" />
        </div>
        <label htmlFor="lang" className="flex-1 text-sm font-medium text-gray-900">{t('settings.language')}</label>
        <select
          id="lang"
          value={t.lang}
          onChange={(e) => setLang(e.target.value as Lang)}
          className="h-9 rounded-lg border border-gray-200 bg-white px-2 text-sm text-gray-900"
        >
          {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
        </select>
      </div>
      <div className="flex items-center gap-3 px-4 py-3 border-t border-gray-50">
        <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
          <Moon size={16} className="text-blue-600" />
        </div>
        <span className="flex-1 text-sm font-medium text-gray-900">{t('settings.theme')}</span>
        <div role="radiogroup" aria-label={t('settings.theme')} className="inline-flex rounded-lg border border-gray-200 p-0.5 text-xs">
          {(['auto', 'light', 'dark'] as Theme[]).map((v) => (
            <button
              key={v} role="radio" aria-checked={theme === v} onClick={() => setTheme(v)}
              className={`h-8 px-2.5 rounded-md ${theme === v ? 'bg-blue-600 text-white font-medium' : 'text-gray-600'}`}
            >
              {t(`settings.theme.${v}` as const)}
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
}
