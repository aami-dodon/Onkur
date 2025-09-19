import { useEffect, useState } from 'react';

const SUPPORT_TYPES = [
  { value: 'FUNDS', label: 'Financial support (₹)' },
  { value: 'IN_KIND', label: 'In-kind resources' },
];

export default function SponsorSupportForm({ event, onSubmit, onCancel, isSubmitting = false, initialSponsorship }) {
  const [type, setType] = useState('FUNDS');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!initialSponsorship) {
      setType('FUNDS');
      setAmount('');
      setNotes('');
      return;
    }
    setType(initialSponsorship.type || 'FUNDS');
    setAmount(
      initialSponsorship.amount !== undefined && initialSponsorship.amount !== null
        ? String(initialSponsorship.amount)
        : ''
    );
    setNotes(initialSponsorship.notes || '');
  }, [initialSponsorship]);

  if (!event) {
    return null;
  }

  const handleSubmit = async (eventSubmit) => {
    eventSubmit.preventDefault();
    setError('');
    setMessage('');

    if (type === 'FUNDS' && (!amount || Number(amount) <= 0)) {
      setError('Enter an estimated amount for financial sponsorships.');
      return;
    }

    try {
      await onSubmit?.({
        type,
        amount: amount ? Number(amount) : undefined,
        notes: notes.trim() || undefined,
      });
      setMessage('Thank you! Your pledge is recorded.');
    } catch (submissionError) {
      setError(submissionError.message || 'Unable to save sponsorship right now.');
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-3xl border border-brand-forest/15 bg-white p-5 shadow-[0_24px_48px_rgba(47,133,90,0.08)]"
    >
      <header className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-[0.24em] text-brand-muted">Support</span>
        <h3 className="m-0 font-display text-xl font-semibold text-brand-forest">{event.title}</h3>
        <p className="m-0 text-sm text-brand-muted">{event.location}</p>
      </header>
      <div className="flex flex-col gap-3">
        {SUPPORT_TYPES.map((option) => (
          <label key={option.value} className="flex items-center gap-3 rounded-2xl border border-brand-forest/15 bg-brand-sand/60 px-4 py-3 text-sm font-medium text-brand-forest">
            <input
              type="radio"
              name="sponsorType"
              value={option.value}
              checked={type === option.value}
              onChange={() => setType(option.value)}
              className="h-4 w-4 text-brand-forest focus:ring-brand-green"
            />
            {option.label}
          </label>
        ))}
      </div>
      {type === 'FUNDS' ? (
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-semibold text-brand-forest">Estimated amount (₹)</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(eventChange) => setAmount(eventChange.target.value)}
            className="rounded-lg border border-brand-forest/20 bg-brand-sand/40 px-3 py-2 text-sm shadow-sm focus:border-brand-green focus:outline-none"
            placeholder="50000"
          />
        </label>
      ) : null}
      <label className="flex flex-col gap-2 text-sm">
        <span className="font-semibold text-brand-forest">Notes for the team</span>
        <textarea
          rows={3}
          value={notes}
          onChange={(eventChange) => setNotes(eventChange.target.value)}
          className="rounded-lg border border-brand-forest/20 bg-brand-sand/40 px-3 py-2 text-sm shadow-sm focus:border-brand-green focus:outline-none"
          placeholder="Share how you plan to support or recognition preferences."
        />
      </label>
      {error ? <p className="m-0 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      {message ? <p className="m-0 rounded-xl border border-brand-green/20 bg-brand-sand/70 p-3 text-sm text-brand-forest">{message}</p> : null}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Submitting…' : 'Confirm sponsorship'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-brand-forest/20 bg-white px-3 py-2 text-sm font-semibold text-brand-forest shadow-sm"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
