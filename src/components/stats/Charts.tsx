'use client';

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { arc as d3arc, pie as d3pie } from 'd3-shape';
import { scaleBand, scaleLinear } from 'd3-scale';
import { max as d3max } from 'd3-array';
import { categoryOf, formatCurrency } from '@/lib/utils/balance';
import type { TripStats } from '@/lib/utils/stats';

/**
 * Colour follows the category, never its rank (validated categorical palette, light mode).
 * "Other" is the de-emphasis grey. Three hues sit under 3:1 contrast, so every chart
 * ships with a labelled list or readout beside it.
 */
export const CAT_COLOR: Record<string, string> = {
  food: '#2a78d6',
  drinks: '#eb6834',
  stay: '#1baf7a',
  travel: '#eda100',
  activities: '#e87ba4',
  shopping: '#008300',
  other: '#a3a29c',
};
const SURFACE = '#ffffff';
const GAIN = '#2a78d6'; // diverging pole: fronted money for others
const LOSS = '#e34948'; // diverging pole: others paid for them
const MID = '#d6d5d0'; // neutral zero line

/** Rect with only its top corners rounded, so the bar stays square on the baseline. */
const topRounded = (x: number, y: number, w: number, h: number, r: number) => {
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
};

const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);
const compact = (n: number) => (n >= 100000 ? `${(n / 100000).toFixed(1)}L` : n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(Math.round(n)));

/** Donut: where the money went. Tap a slice or a row to read it in the centre. */
export function CategoryDonut({ stats }: { stats: TripStats }) {
  const [active, setActive] = useState<string | null>(null);
  const size = 200;
  const r = size / 2;
  const slices = useMemo(
    () => d3pie<TripStats['byCategory'][number]>().value((d) => d.total).sort(null).padAngle(0.02)(stats.byCategory),
    [stats.byCategory],
  );
  const arc = d3arc<(typeof slices)[number]>().innerRadius(r * 0.62).outerRadius(r - 2).cornerRadius(3);
  const arcActive = d3arc<(typeof slices)[number]>().innerRadius(r * 0.62).outerRadius(r).cornerRadius(3);
  const sel = stats.byCategory.find((c) => c.key === active);

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox={`${-r} ${-r} ${size} ${size}`} width={size} height={size} role="img" aria-label="Spending by category">
          {slices.map((s) => (
            <path
              key={s.data.key}
              d={(s.data.key === active ? arcActive : arc)(s) ?? ''}
              fill={CAT_COLOR[s.data.key]}
              stroke={SURFACE}
              strokeWidth={2}
              opacity={active && active !== s.data.key ? 0.35 : 1}
              className="cursor-pointer transition-opacity"
              onClick={() => setActive(active === s.data.key ? null : s.data.key)}
            >
              <title>{`${s.data.label}: ${formatCurrency(s.data.total)} (${pct(s.data.total, stats.total)}%)`}</title>
            </path>
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-8">
          <p className="text-xs text-gray-500">{sel ? `${sel.emoji} ${sel.label}` : 'Total'}</p>
          <p className="font-bold text-gray-900 text-lg leading-tight">{formatCurrency(sel ? sel.total : stats.total)}</p>
          {sel && <p className="text-xs text-gray-500">{pct(sel.total, stats.total)}% of the trip</p>}
        </div>
      </div>

      <ul className="w-full space-y-1">
        {stats.byCategory.map((c) => (
          <li key={c.key}>
            <button
              onClick={() => setActive(active === c.key ? null : c.key)}
              className={`w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-left ${active === c.key ? 'bg-gray-100' : ''}`}
            >
              <span className="h-3 w-3 rounded-sm shrink-0" style={{ background: CAT_COLOR[c.key] }} aria-hidden />
              <span className="flex-1 text-gray-700 truncate">{c.emoji} {c.label}</span>
              <span className="text-gray-900 font-medium tabular-nums">{formatCurrency(c.total)}</span>
              <span className="w-9 text-right text-gray-400 tabular-nums">{pct(c.total, stats.total)}%</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Stacked bars: each day's spend, split by category. Tap a day for its breakdown. */
export function DailyStacked({ stats }: { stats: TripStats }) {
  const days = stats.byDayCategory;
  const [picked, setPicked] = useState<string | null>(null);
  const W = 340, H = 170, m = { t: 8, r: 4, b: 22, l: 34 };
  const x = scaleBand().domain(days.map((d) => d.date)).range([m.l, W - m.r]).paddingInner(0.25).paddingOuter(0.1);
  const y = scaleLinear().domain([0, d3max(days, (d) => d.total) || 1]).nice(3).range([H - m.b, m.t]);
  const avg = stats.perDay;
  const showEvery = Math.ceil(days.length / 7); // keep date labels from colliding
  const day = days.find((d) => d.date === picked) ?? days.reduce((a, b) => (b.total > a.total ? b : a));

  return (
    <div>
      {/* Readout: the picked day, or the biggest day by default */}
      <div className="min-h-[2.75rem] mb-1">
        <p className="text-sm text-gray-900">
          <span className="font-semibold">{format(new Date(day.date), 'EEE d MMM')}</span>{' '}
          <span className="tabular-nums">{formatCurrency(day.total)}</span>
          {!picked && <span className="text-gray-500"> · biggest day</span>}
        </p>
        <p className="text-xs text-gray-500 truncate">
          {day.parts.map((p) => `${categoryOf(p.key).emoji} ${formatCurrency(p.total)}`).join('  ')}
        </p>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Spending per day by category">
        {y.ticks(3).map((t) => (
          <g key={t}>
            <line x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} stroke="#eceae4" />
            <text x={m.l - 6} y={y(t)} dy="0.32em" textAnchor="end" className="fill-gray-400 text-[10px] tabular-nums">{compact(t)}</text>
          </g>
        ))}
        {days.map((d, i) => {
          let y0 = 0;
          const bw = x.bandwidth();
          return (
            <g key={d.date} onClick={() => setPicked(picked === d.date ? null : d.date)} className="cursor-pointer">
              {/* Generous hit target: the full column */}
              <rect x={x(d.date)} y={m.t} width={bw} height={H - m.b - m.t} fill="transparent" />
              {d.parts.map((p, j) => {
                const top = y(y0 + p.total);
                const h = y(y0) - top;
                y0 += p.total;
                const last = j === d.parts.length - 1;
                const fade = picked && picked !== d.date ? 0.35 : 1;
                // 2px surface gap between stacked segments
                const hh = Math.max(h - (j === 0 ? 0 : 2), 0.5);
                return last ? (
                  <path key={p.key} d={topRounded(x(d.date) ?? 0, top, bw, hh, 4)} fill={CAT_COLOR[p.key]} opacity={fade} />
                ) : (
                  <rect key={p.key} x={x(d.date)} y={top} width={bw} height={hh} fill={CAT_COLOR[p.key]} opacity={fade} />
                );
              })}
              {i % showEvery === 0 && (
                <text x={(x(d.date) ?? 0) + bw / 2} y={H - 6} textAnchor="middle" className="fill-gray-500 text-[10px]">
                  {format(new Date(d.date), 'd MMM')}
                </text>
              )}
              <title>{`${format(new Date(d.date), 'd MMM')}: ${formatCurrency(d.total)}`}</title>
            </g>
          );
        })}
        {/* Daily average */}
        <line x1={m.l} x2={W - m.r} y1={y(avg)} y2={y(avg)} stroke="#52514e" strokeDasharray="3 3" />
        <text x={W - m.r} y={y(avg) - 4} textAnchor="end" className="fill-gray-500 text-[10px]">avg {compact(avg)}</text>
      </svg>
    </div>
  );
}

/** Diverging bars: who fronted money for the group (paid upfront minus their own share). */
export function FrontedBars({ stats, me }: { stats: TripStats; me: string }) {
  const rows = stats.fronted.filter((f) => Math.abs(f.net) >= 1);
  const lim = d3max(rows, (f) => Math.abs(f.net)) || 1;
  const x = scaleLinear().domain([-lim, lim]).range([0, 100]);

  return (
    <div>
      <div className="flex justify-between text-[11px] text-gray-500 mb-2">
        <span>← others covered them</span>
        <span>covered others →</span>
      </div>
      <ul className="space-y-2.5">
        {rows.map((f) => {
          const left = Math.min(x(0), x(f.net));
          const width = Math.abs(x(f.net) - x(0));
          return (
            <li key={f.id} title={`Paid ${formatCurrency(f.paid)}, share ${formatCurrency(f.share)}`}>
              <div className="flex justify-between gap-3 text-sm mb-1">
                <span className={`truncate ${f.id === me ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>{f.id === me ? 'You' : f.name}</span>
                <span className="font-medium text-gray-900 tabular-nums shrink-0">
                  {f.net > 0 ? '+' : '−'}{formatCurrency(Math.abs(f.net))}
                </span>
              </div>
              <div className="relative h-2.5">
                <div className="absolute inset-y-[-3px] w-px" style={{ left: '50%', background: MID }} aria-hidden />
                <div
                  className="absolute inset-y-0 rounded-full"
                  style={{ left: `${left}%`, width: `${Math.max(width, 0.8)}%`, background: f.net > 0 ? GAIN : LOSS }}
                />
              </div>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-gray-500 mt-3">What each person paid at the counter minus their own share. Settle-up payments aren’t counted here.</p>
    </div>
  );
}
