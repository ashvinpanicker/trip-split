'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CONTACT_EMAIL } from '@/lib/marketing/site';

const FACES = ['😞', '😕', '😐', '🙂', '😍'];

export default function FeedbackForm() {
  const [rating, setRating] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [contact, setContact] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (message.trim().length < 2) return;
    setState('sending');
    const source = new URLSearchParams(location.search).get('from')?.slice(0, 60) || null;
    const { error } = await createClient().from('feedback').insert({
      message: message.trim().slice(0, 4000), rating, contact: contact.trim().slice(0, 200) || null, source,
    });
    setState(error ? 'failed' : 'sent');
  }

  if (state === 'sent') {
    return <p className="mt-8 text-xl font-semibold">Thank you! 🙏 Got it.</p>;
  }

  return (
    <form onSubmit={send} className="mt-8 space-y-5">
      <fieldset>
        <legend className="font-semibold">How did it go?</legend>
        <div className="mt-2 flex gap-2">
          {FACES.map((f, i) => (
            <button
              key={f} type="button" onClick={() => setRating(i + 1)} aria-label={`${i + 1} out of 5`} aria-pressed={rating === i + 1}
              className={`h-12 w-12 rounded-full text-2xl border ${rating === i + 1 ? 'border-[var(--blue)] bg-white' : 'border-[var(--rule)]'}`}
            >{f}</button>
          ))}
        </div>
      </fieldset>
      <label className="block">
        <span className="font-semibold">Your feedback</span>
        <textarea
          required value={message} onChange={(e) => setMessage(e.target.value)} rows={5} maxLength={4000}
          placeholder="The settle-up screen confused my friends because…"
          className="mt-2 block w-full rounded-xl border border-[var(--rule)] bg-white p-3 text-base"
        />
      </label>
      <label className="block">
        <span className="font-semibold">Email or WhatsApp (optional)</span>
        <span className="block text-sm text-[var(--ink-soft)]">Only if you&apos;d like a reply.</span>
        <input
          value={contact} onChange={(e) => setContact(e.target.value)} maxLength={200}
          className="mt-2 block w-full h-12 rounded-xl border border-[var(--rule)] bg-white px-3 text-base"
        />
      </label>
      <button disabled={state === 'sending'} className="btn btn-primary">{state === 'sending' ? 'Sending…' : 'Send feedback'}</button>
      {state === 'failed' && (
        <p className="text-sm">
          That didn&apos;t go through. Please email it to{' '}
          <a className="underline" href={`mailto:${CONTACT_EMAIL}?subject=TripSplit feedback&body=${encodeURIComponent(message)}`}>{CONTACT_EMAIL}</a>.
        </p>
      )}
    </form>
  );
}
