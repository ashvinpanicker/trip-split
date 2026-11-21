/**
 * A paper plane, folded from the ledger page, loops across the hero leaving a dotted trail.
 * Pure SVG (SMIL), no JS. Hidden from screen readers; a still plane is shown when motion is reduced.
 */
const ROUTE = 'M -60 250 C 120 80, 300 60, 430 170 S 700 330, 820 180 S 1000 40, 1080 120';

function Plane() {
  return (
    <g>
      {/* body */}
      <path d="M -16 -10 L 18 0 L -16 10 L -9 0 Z" fill="#fff" stroke="var(--blue)" strokeWidth="1.6" strokeLinejoin="round" />
      {/* fold, in the ledger's red margin colour */}
      <path d="M -9 0 L 18 0" stroke="var(--margin)" strokeWidth="1.2" />
      <path d="M -16 10 L -6 3" stroke="var(--blue)" strokeWidth="1.2" />
    </g>
  );
}

export default function PaperPlane() {
  return (
    <svg
      aria-hidden
      className="mk-plane pointer-events-none absolute inset-0 -z-10 h-full w-full"
      viewBox="0 0 1000 400"
      preserveAspectRatio="xMidYMid slice"
    >
      <path d={ROUTE} fill="none" stroke="var(--rule)" strokeWidth="2" strokeDasharray="2 9" strokeLinecap="round" />
      <g className="mk-plane-fly">
        <Plane />
        <animateMotion dur="14s" repeatCount="indefinite" rotate="auto" path={ROUTE} keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines="0.45 0 0.55 1" />
      </g>
      <g className="mk-plane-still" transform="translate(820 180) rotate(-35)">
        <Plane />
      </g>
    </svg>
  );
}
