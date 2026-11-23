/**
 * The numbers behind a trip's balances, laid out so anyone can check them by hand:
 *   balance = paid for the group − own share + payments sent − payments received
 * (someone who pays you back has settled part of what you were owed).
 * Everything is summed in paise, so totals match the app to the cent.
 */
type Person = { id: string; name: string };
type Exp = {
  paid_by: string | null; paid_by_pending?: string | null; amount: number;
  participants: { user_id: string | null; pending_member_id: string | null; share_amount: number }[];
};
type Pay = { from_person: string; to_person: string; amount: number };

export type StatementRow = { id: string; name: string; paid: number; share: number; sent: number; received: number; net: number };

const p = (n: number) => Math.round(Number(n) * 100);

export function statementRows(expenses: Exp[], persons: Person[], payments: Pay[]) {
  const rows = new Map<string, { paid: number; share: number; sent: number; received: number }>(
    persons.map((x) => [x.id, { paid: 0, share: 0, sent: 0, received: 0 }]),
  );
  const row = (id: string | null | undefined) => (id ? rows.get(id) : undefined);
  for (const e of expenses) {
    const payer = row(e.paid_by ?? e.paid_by_pending);
    if (payer) payer.paid += p(e.amount);
    for (const part of e.participants) {
      const r = row(part.user_id ?? part.pending_member_id);
      if (r) r.share += p(part.share_amount);
    }
  }
  for (const s of payments) {
    const from = row(s.from_person), to = row(s.to_person);
    if (from) from.sent += p(s.amount);
    if (to) to.received += p(s.amount);
  }
  const out: StatementRow[] = persons.map((x) => {
    const r = rows.get(x.id)!;
    return { id: x.id, name: x.name, paid: r.paid / 100, share: r.share / 100, sent: r.sent / 100, received: r.received / 100,
      net: (r.paid - r.share + r.sent - r.received) / 100 };
  });
  const sum = (k: keyof Omit<StatementRow, 'id' | 'name'>) => out.reduce((a, r) => a + p(r[k]), 0) / 100;
  const totals = { paid: sum('paid'), share: sum('share'), sent: sum('sent'), received: sum('received'), net: sum('net') };
  // Checks a reader can verify: everything paid was shared out, and balances cancel out
  const checks = { paidEqualsShares: p(totals.paid) === p(totals.share), netIsZero: p(totals.net) === 0 };
  return { rows: out, totals, checks };
}
