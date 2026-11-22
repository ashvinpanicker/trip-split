import type { Metadata } from 'next';
import FeedbackForm from './FeedbackForm';

export const metadata: Metadata = {
  title: 'Send feedback',
  description: 'Tell us what to fix or add in TripSplit. It takes a minute and every message is read.',
  alternates: { canonical: '/feedback' },
};

export default function Page() {
  return (
    <article className="wrap pt-8 sm:pt-14 max-w-xl">
      <h1 className="text-4xl sm:text-5xl font-extrabold tracking-[-0.03em]">How was TripSplit?</h1>
      <p className="mt-3 text-[var(--ink-soft)]">
        What confused you, what you wish it did, what you liked. Every message is read by the person who builds it.
      </p>
      <FeedbackForm />
    </article>
  );
}
