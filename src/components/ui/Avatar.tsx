import { cn } from '@/lib/utils/cn';

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-xl',
};

const colors = [
  'bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-green-500',
  'bg-yellow-500', 'bg-orange-500', 'bg-red-500', 'bg-teal-500',
];

function getColor(name?: string | null) {
  if (!name) return 'bg-gray-400';
  const code = name.charCodeAt(0) + (name.charCodeAt(1) || 0);
  return colors[code % colors.length];
}

function getInitials(name?: string | null) {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

export default function Avatar({ src, name, size = 'md', className }: AvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={name || 'User'}
        className={cn('rounded-full object-cover', sizeClasses[size], className)}
      />
    );
  }

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0',
        sizeClasses[size],
        getColor(name),
        className
      )}
    >
      {getInitials(name)}
    </div>
  );
}
