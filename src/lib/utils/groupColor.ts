/**
 * A stable colour per group, picked from its id, so a trip keeps its colour everywhere
 * (tiles, labels) even as groups are added. Tint backgrounds with dark text for contrast.
 */
const PALETTE = [
  { bg: '#dbeafe', fg: '#1e40af', dot: '#2563eb' }, // blue
  { bg: '#ffedd5', fg: '#9a3412', dot: '#ea580c' }, // orange
  { bg: '#d1fae5', fg: '#065f46', dot: '#059669' }, // emerald
  { bg: '#ede9fe', fg: '#5b21b6', dot: '#7c3aed' }, // violet
  { bg: '#fce7f3', fg: '#9d174d', dot: '#db2777' }, // pink
  { bg: '#fef3c7', fg: '#92400e', dot: '#d97706' }, // amber
  { bg: '#cffafe', fg: '#155e75', dot: '#0891b2' }, // cyan
  { bg: '#ecfccb', fg: '#3f6212', dot: '#65a30d' }, // lime
];

export type GroupColor = (typeof PALETTE)[number];

export function groupColor(id: string): GroupColor {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

/**
 * Colours for a set of groups, unique while there are 8 or fewer: each group starts at its own
 * stable colour and, on a clash, takes the next free one. Oldest groups choose first, so adding
 * a trip never recolours the existing ones.
 */
export function groupColors(groups: { id: string; created_at?: string }[]): Record<string, GroupColor> {
  const out: Record<string, GroupColor> = {};
  const used = new Set<number>();
  const ordered = [...groups].sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? '') || a.id.localeCompare(b.id));
  for (const g of ordered) {
    let h = 0;
    for (let i = 0; i < g.id.length; i++) h = (h * 31 + g.id.charCodeAt(i)) >>> 0;
    let k = h % PALETTE.length;
    for (let n = 0; n < PALETTE.length && used.has(k); n++) k = (k + 1) % PALETTE.length;
    if (used.size >= PALETTE.length) used.clear(); // more than 8 trips: start reusing
    used.add(k);
    out[g.id] = PALETTE[k];
  }
  return out;
}
