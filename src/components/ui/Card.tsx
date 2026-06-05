import { cn } from '@/lib/utils/cn';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  padding?: 'none' | 'sm' | 'md';
}

export default function Card({ children, className, onClick, padding = 'md' }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white rounded-2xl shadow-sm border border-gray-100',
        padding === 'md' && 'p-4',
        padding === 'sm' && 'p-3',
        onClick && 'cursor-pointer active:scale-98 transition-transform',
        className
      )}
    >
      {children}
    </div>
  );
}
