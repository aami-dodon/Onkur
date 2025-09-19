import { useEffect, useMemo, useState } from 'react';

function formatHours(value) {
  if (!value) return '0';
  return (Math.round(value * 10) / 10).toString();
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export default function HoursTracker({ summary, signups, onLogHours }) {
  const [form, setForm] = useState({ eventId: '', hours: '', note: '' });
  const [status, setStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const upcomingOptions = useMemo(() => {
    return signups
      .map((signup) => ({
        id: signup.eventId,
        title: signup.event?.title || 'Upcoming event',
        isUpcoming: signup.isUpcoming,
      }))
      .sort((a, b) => {
        if (a.isUpcoming === b.isUpcoming) return a.title.localeCompare(b.title);
        return a.isUpcoming ? -1 : 1;
      });
  }, [signups]);

  useEffect(() => {
    if (!upcomingOptions.length) return;
    if (!upcomingOptions.some((option) => option.id === form.eventId)) {
      setForm((prev) => ({ ...prev, eventId: upcomingOptions[0].id }));
    }
  }, [upcomingOptions, form.eventId]);

  useEffect(() => {
    if (!summary) return;
    setStatus(null);
  }, [summary]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!onLogHours || !form.eventId) {
      setStatus({ type: 'error', message: 'Select an event to log your time.' });
      return;
    }
    const numericHours = Number(form.hours);
    if (!Number.isFinite(numericHours) || numericHours <= 0) {
      setStatus({ type: 'error', message: 'Enter the hours you completed (greater than zero).' });
      return;
    }

    setSubmitting(true);
    setStatus(null);
    try {
      const minutes = Math.round(numericHours * 60);
      await onLogHours({ eventId: form.eventId, minutes, note: form.note });
      setStatus({ type: 'success', message: 'Hours recorded. Thank you for showing up!' });
      setForm((prev) => ({ ...prev, hours: '', note: '' }));
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Unable to log your hours.' });
    } finally {
      setSubmitting(false);
    }
  };

  const totalHours = formatHours(summary?.totalHours || 0);
  const earnedBadges = summary?.badges?.filter((badge) => badge.earned).length || 0;

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-2xl border border-brand-forest/10 bg-white p-4 shadow-[0_12px_24px_rgba(47,133,90,0.08)]">
        <h4 className="m-0 text-base font-semibold text-brand-forest">Impact snapshot</h4>
        <p className="mt-2 text-sm text-brand-muted">
          Hours logged: <strong className="font-semibold text-brand-forest">{totalHours}</strong>
        </p>
        <p className="m-0 text-sm text-brand-muted">Badges earned: {earnedBadges}</p>
      </section>

      <section className="flex flex-col gap-3">
        <h4 className="m-0 text-base font-semibold text-brand-forest">Log new hours</h4>
        <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold text-brand-forest">Event</span>
            {upcomingOptions.length ? (
              <select
                className="rounded-lg border border-brand-forest/20 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-green focus:outline-none"
                name="eventId"
                value={form.eventId}
                onChange={handleChange}
              >
                {upcomingOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.title}
                    {option.isUpcoming ? ' (upcoming)' : ''}
                  </option>
                ))}
              </select>
            ) : (
              <p className="m-0 rounded-lg border border-dashed border-brand-forest/30 bg-white px-3 py-2 text-sm text-brand-muted">
                Join an event to log your time.
              </p>
            )}
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold text-brand-forest">Hours completed</span>
            <input
              className="rounded-lg border border-brand-forest/20 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-green focus:outline-none"
              type="number"
              name="hours"
              min="0"
              step="0.25"
              placeholder="e.g. 2"
              value={form.hours}
              onChange={handleChange}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold text-brand-forest">Notes (optional)</span>
            <textarea
              className="min-h-[72px] rounded-lg border border-brand-forest/20 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-green focus:outline-none"
              name="note"
              placeholder="What did you work on?"
              value={form.note}
              onChange={handleChange}
            />
          </label>
          {status ? (
            <p
              className={`m-0 text-sm ${
                status.type === 'success' ? 'text-brand-green' : 'text-red-600'
              }`}
            >
              {status.message}
            </p>
          ) : null}
          <button type="submit" className="btn-primary" disabled={submitting || !upcomingOptions.length}>
            {submitting ? 'Saving…' : 'Log hours'}
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-3">
        <h4 className="m-0 text-base font-semibold text-brand-forest">Eco badges</h4>
        <ul className="m-0 grid list-none gap-3 p-0">
          {summary?.badges?.map((badge) => (
            <li
              key={badge.slug}
              className={`rounded-2xl border border-brand-forest/10 bg-white p-3 text-sm shadow-sm ${
                badge.earned ? 'ring-1 ring-brand-green/40' : ''
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="m-0 font-semibold text-brand-forest">{badge.label}</p>
                  <p className="m-0 text-xs text-brand-muted">{badge.description}</p>
                </div>
                <span className="text-xs font-semibold text-brand-muted">{badge.thresholdHours} hrs</span>
              </div>
              {badge.earned ? (
                <p className="mt-2 text-xs font-semibold text-brand-green">
                  Earned {badge.earnedAt ? `on ${formatDate(badge.earnedAt)}` : '🎉'}
                </p>
              ) : (
                <p className="mt-2 text-xs text-brand-muted">
                  {`Log ${Math.max(0, badge.thresholdHours - (summary?.totalHours || 0)).toFixed(1)} more hours to unlock.`}
                </p>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h4 className="m-0 text-base font-semibold text-brand-forest">Recent log entries</h4>
        {summary?.entries?.length ? (
          <ul className="m-0 list-none space-y-2 p-0">
            {summary.entries.slice(0, 5).map((entry) => (
              <li
                key={entry.id}
                className="rounded-2xl border border-brand-forest/10 bg-white px-3 py-2 text-sm text-brand-muted shadow-sm"
              >
                <p className="m-0 font-semibold text-brand-forest">
                  {entry.event?.title || 'Volunteer hours'}
                </p>
                <p className="m-0 text-xs text-brand-muted">
                  {formatDate(entry.createdAt)} • {(entry.minutes / 60).toFixed(2)} hrs
                </p>
                {entry.note ? <p className="m-0 text-xs text-brand-muted">{entry.note}</p> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="m-0 text-sm text-brand-muted">Log your first hours to see them here.</p>
        )}
      </section>
    </div>
  );
}
