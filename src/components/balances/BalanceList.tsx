import Avatar from '@/components/ui/Avatar';
import { formatCurrency } from '@/lib/utils/balance';
import type { Balance } from '@/types';

interface BalanceListProps {
  balances: Balance[];
  currentUserId: string;
}

export default function BalanceList({ balances, currentUserId }: BalanceListProps) {
  if (balances.length === 0) {
    return <p className="text-gray-500 text-sm text-center py-4">No balances yet</p>;
  }

  return (
    <div className="space-y-2">
      {balances.map((b) => {
        const isYou = b.person_id === currentUserId;
        const isOwed = b.net_balance > 0.01;
        const settled = Math.abs(b.net_balance) <= 0.01;

        return (
          <div key={b.person_id} className="flex items-center gap-3 py-2">
            <Avatar src={b.avatar_url} name={b.user_name} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium text-gray-900">
                  {isYou ? 'You' : b.user_name}
                </p>
                {b.is_pending && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">pending</span>
                )}
              </div>
              <p className="text-xs text-gray-500">
                {settled ? 'All settled up' : isOwed ? `is owed ${formatCurrency(b.net_balance)}` : `owes ${formatCurrency(-b.net_balance)}`}
              </p>
            </div>
            <span className={`text-sm font-bold ${settled ? 'text-gray-400' : isOwed ? 'text-green-600' : 'text-red-500'}`}>
              {settled ? '—' : isOwed ? `+${formatCurrency(b.net_balance)}` : formatCurrency(b.net_balance)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
