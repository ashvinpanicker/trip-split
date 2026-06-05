'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, PlusCircle, BarChart2, User } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const navItems = [
  { href: '/dashboard', icon: Home, label: 'Home' },
  { href: '/groups', icon: Users, label: 'Groups' },
  { href: '/dashboard', icon: PlusCircle, label: 'Add', isAction: true },
  { href: '/balances', icon: BarChart2, label: 'Balances' },
  { href: '/profile', icon: User, label: 'Profile' },
];

interface BottomNavProps {
  onAddExpense?: () => void;
}

export default function BottomNav({ onAddExpense }: BottomNavProps) {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-40 safe-area-inset-bottom">
      <div className="flex items-center justify-around max-w-lg mx-auto" style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

          if (item.isAction) {
            return (
              <button
                key={item.label}
                onClick={onAddExpense}
                className="flex flex-col items-center pt-2 pb-1 px-3"
              >
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-200 -mt-4">
                  <Icon size={22} className="text-white" />
                </div>
                <span className="text-xs text-gray-400 mt-1">{item.label}</span>
              </button>
            );
          }

          return (
            <Link
              key={item.href + item.label}
              href={item.href}
              className="flex flex-col items-center pt-2 pb-1 px-3 min-w-0"
            >
              <Icon
                size={22}
                className={cn(
                  isActive ? 'text-blue-600' : 'text-gray-400'
                )}
              />
              <span
                className={cn(
                  'text-xs mt-1',
                  isActive ? 'text-blue-600 font-medium' : 'text-gray-400'
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
