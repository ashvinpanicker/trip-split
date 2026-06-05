import { type ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  left?: ReactNode;
  right?: ReactNode;
  className?: string;
}

export default function AppHeader({ title, subtitle, left, right, className }: AppHeaderProps) {
  return (
    <header className={cn('bg-white border-b border-gray-100 sticky top-0 z-30', className)}>
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          {left}
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-gray-900 truncate">{title}</h1>
            {subtitle && <p className="text-xs text-gray-500 truncate">{subtitle}</p>}
          </div>
        </div>
        {right && <div className="flex items-center gap-2 ml-2 flex-shrink-0">{right}</div>}
      </div>
    </header>
  );
}
