'use client';

import { Languages, Moon, SlidersHorizontal } from 'lucide-react';
import { useTheme, type Theme } from '@/lib/theme';
import { useT, setLang, LANGS, type Lang } from '@/lib/i18n';
import Card from '@/components/ui/Card';
import { FEATURES, setFeatures, useFeatureChoice, withDefaults } from '@/hooks/useFeatures';
import Switch from '@/components/ui/Switch';

/** Optional features, one switch each. Off for friends, on for trip admins until they choose. */
export function FeaturesCard({ isAdminSomewhere }: { isAdminSomewhere: boolean }) {
  const t = useT();
  const choice = useFeatureChoice();
  const f = withDefaults(choice, isAdminSomewhere);
  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1.5 px-1">
        <SlidersHorizontal size={13} /> {t('settings.features')}
      </p>
      <Card padding="none">
        {FEATURES.map((k, i) => (
          <label key={k} className={`flex items-start gap-3 px-4 py-3 cursor-pointer ${i ? 'border-t border-gray-50' : ''}`}>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">{t(`feat.${k}` as const)}</p>
              <p className="text-xs text-gray-500 mt-0.5">{t(`feat.${k}.hint` as const)}</p>
            </div>
            <Switch checked={f[k]} onChange={(on) => setFeatures({ [k]: on }, f)} />
          </label>
        ))}
      </Card>
      {!choice && <p className="text-xs text-gray-500 mt-1.5 px-1">{t('settings.featuresHint')}</p>}
    </div>
  );
}

/** Language and theme (per device). */
export default function SettingsCard() {
  const t = useT();
  const { theme, setTheme } = useTheme();
  return (
    <Card padding="none">
      <div className="flex items-center gap-3 px-4 py-3">
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
