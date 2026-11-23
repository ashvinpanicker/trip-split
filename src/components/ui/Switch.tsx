'use client';

/** iOS-style on/off switch. Wrap it in a <label> with the text so the whole row toggles. */
export default function Switch({ checked, onChange, label }: { checked: boolean; onChange: (on: boolean) => void; label?: string }) {
  return (
    <input
      type="checkbox"
      role="switch"
      aria-label={label}
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="mt-0.5 h-6 w-11 flex-shrink-0 appearance-none rounded-full bg-gray-300 transition-colors checked:bg-blue-600 relative cursor-pointer before:absolute before:top-0.5 before:left-0.5 before:h-5 before:w-5 before:rounded-full before:bg-white before:shadow before:transition-transform checked:before:translate-x-5"
    />
  );
}
