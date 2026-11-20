import Avatar from '@/components/ui/Avatar';
import { formatCurrency } from '@/lib/utils/balance';
import type { Balance } from '@/types';

interface BalanceListProps {
  balances: Balance[];
  currentUserId: string;
  /** Tap a person to see what's between you and them */
  onSelect?: (personId: string) => void;
}

export default function BalanceList({ balances, currentUserId, onSelect }: BalanceListProps) {
  if (balances.length === 0) {
    return <p className="text-gray-500 text-sm text-center py-4">No balances yet</p>;
  }

  return (
    <div className="space-y-2">
      {balances.map((b) => {
        const isYou = b.person_id === currentUserId;
        const isOwed = b.net_balance > 0;
        const settled = b.net_balance === 0;

        const tappable = !!onSelect && !isYou;
        return (
          <div
            key={b.person_id}
            className={`flex items-center gap-3 py-2 ${tappable ? 'cursor-pointer active:bg-gray-50 -mx-2 px-2 rounded-lg' : ''}`}
            {...(tappable ? { role: 'button', tabIndex: 0, onClick: () => onSelect!(b.person_id), onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter') onSelect!(b.person_id); } } : {})}
          >
            <Avatar src={b.avatar_url} name={b.user_name} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {isYou ? 'You' : b.user_name}
                </p>
                {b.is_pending && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">pending</span>
                )}
              </div>
              <p className="text-xs text-gray-500">
                {settled ? 'All settled up' : isOwed ? `${isYou ? 'are' : 'is'} owed ${formatCurrency(b.net_balance)}` : `${isYou ? 'owe' : 'owes'} ${formatCurrency(-b.net_balance)}`}
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
