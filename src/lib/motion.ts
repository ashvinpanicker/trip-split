import type { Transition } from 'motion/react';

/** One feel for the whole app: quick, a touch of bounce, no lingering. */
export const spring: Transition = { type: 'spring', stiffness: 520, damping: 40, mass: 0.7 };
/** Content swaps (pages, tabs): short fade-up, so it feels instant but not jumpy. */
export const enter = { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.18, ease: 'easeOut' } } as const;
