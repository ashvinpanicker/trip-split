/**
 * TripSplit mark: a paper plane folded from the ledger page. Its centre fold is the
 * "split" line, drawn in the ledger's red margin colour. Keep in sync with public/logo.svg.
 */
export const LOGO_PATHS = {
  bg: '#1a56db',
  wingTop: '#ffffff',
  wingBottom: '#bcd2ff',
  fold: '#ff7a6b',
};

export function LogoMark({ size = 32, className = '', rounded = true }: { size?: number; className?: string; rounded?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden>
      <rect width="64" height="64" rx={rounded ? 15 : 0} fill={LOGO_PATHS.bg} />
      {/* upper wing */}
      <path d="M51 13 L11 30 L26 35 Z" fill={LOGO_PATHS.wingTop} />
      {/* lower wing, the other half of the split */}
      <path d="M51 13 L26 35 L35 51 Z" fill={LOGO_PATHS.wingBottom} />
      {/* the fold: where the trip gets split */}
      <path d="M51 13 L26 35" stroke={LOGO_PATHS.fold} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function LogoLockup({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-bold tracking-tight ${className}`}>
      <LogoMark size={size} />
      TripSplit
    </span>
  );
}
