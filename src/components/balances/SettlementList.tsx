import Avatar from '@/components/ui/Avatar';
import { ArrowRight } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/balance';
import type { Settlement } from '@/types';

interface SettlementListProps {
  settlements: Settlement[];
  currentUserId: string;
}

export default function SettlementList({ settlements, currentUserId }: SettlementListProps) {
  if (settlements.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-2xl mb-2">🎉</p>
        <p className="text-gray-600 font-medium">All settled up!</p>
        <p className="text-gray-400 text-sm">No payments needed</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {settlements.map((s, i) => {
        const isYouPaying = s.from_user_id === currentUserId;
        const isYouReceiving = s.to_user_id === currentUserId;

        return (
          <div
            key={i}
            className={`flex items-center gap-3 p-3 rounded-xl border ${
              isYouPaying
                ? 'bg-red-50 border-red-100'
                : isYouReceiving
                ? 'bg-green-50 border-green-100'
                : 'bg-gray-50 border-gray-100'
            }`}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Avatar name={isYouPaying ? 'You' : s.from_user_name} size="sm" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {isYouPaying ? 'You' : s.from_user_name}
                </p>
                <p className="text-xs text-gray-500">pays</p>
              </div>
            </div>
            <div className="flex flex-col items-center">
              <ArrowRight size={16} className="text-gray-400" />
              <span className={`text-sm font-bold ${isYouPaying ? 'text-red-600' : isYouReceiving ? 'text-green-600' : 'text-gray-900'}`}>
                {formatCurrency(s.amount)}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
              <div className="min-w-0 text-right">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {isYouReceiving ? 'You' : s.to_user_name}
                </p>
                <p className="text-xs text-gray-500">receives</p>
              </div>
              <Avatar name={isYouReceiving ? 'You' : s.to_user_name} size="sm" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
