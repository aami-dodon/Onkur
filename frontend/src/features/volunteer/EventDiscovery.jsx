import { useEffect, useMemo, useState } from 'react';

function formatDateRange(event) {
  if (!event?.dateStart) return 'Date TBA';
  const start = new Date(event.dateStart);
  const end = event.dateEnd ? new Date(event.dateEnd) : null;
  const dateFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' });
  const timeFormatter = new Intl.DateTimeFormat('en-US', { timeStyle: 'short' });

  if (end && start.toDateString() === end.toDateString()) {
    return `${dateFormatter.format(start)} · ${timeFormatter.format(start)} – ${timeFormatter.format(end)}`;
  }
  if (end) {
    return `${dateFormatter.format(start)} ${timeFormatter.format(start)} → ${dateFormatter.format(end)} ${timeFormatter.format(end)}`;
  }
  return `${dateFormatter.format(start)} ${timeFormatter.format(start)}`;
}

function summarize(event) {
  if (!event?.description) return '';
  if (event.description.length <= 140) return event.description;
  return `${event.description.slice(0, 137)}…`;
}

export default function EventDiscovery({ events, filters, onFilterChange, onSignup, onLeave, isLoading }) {
  const [form, setForm] = useState({ category: '', location: '', theme: '', date: '' });
  const [actionStates, setActionStates] = useState({});

  useEffect(() => {
    setForm({
      category: filters?.category || '',
      location: filters?.location || '',
      theme: filters?.theme || '',
      date: filters?.date || '',
    });
  }, [filters]);

  const totalAvailable = useMemo(
    () => events.reduce((count, event) => (event.availableSlots > 0 ? count + 1 : count), 0),
    [events]
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onFilterChange?.({ ...form });
  };

  const handleReset = () => {
    const cleared = { category: '', location: '', theme: '', date: '' };
    setForm(cleared);
    onFilterChange?.(cleared);
  };

  const handleSignup = async (eventId) => {
    if (!onSignup) return;
    setActionStates((prev) => ({ ...prev, [eventId]: { status: 'join-loading' } }));
    try {
      await onSignup(eventId);
      setActionStates((prev) => ({
        ...prev,
        [eventId]: { status: 'join-success', message: 'You\u2019re confirmed!' },
      }));
    } catch (error) {
      setActionStates((prev) => ({
        ...prev,
        [eventId]: { status: 'join-error', message: error.message || 'Unable to join this event.' },
      }));
    }
  };

  const handleLeave = async (eventId) => {
    if (!onLeave) return;
    setActionStates((prev) => ({ ...prev, [eventId]: { status: 'leave-loading' } }));
    try {
      await onLeave(eventId);
      setActionStates((prev) => ({
        ...prev,
        [eventId]: { status: 'leave-success', message: 'You left this event.' },
      }));
    } catch (error) {
      setActionStates((prev) => ({
        ...prev,
        [eventId]: { status: 'leave-error', message: error.message || 'Unable to leave this event.' },
      }));
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <form className="grid gap-3 rounded-2xl border border-brand-forest/10 bg-brand-sand/60 p-4" onSubmit={handleSubmit}>
        <div className="grid gap-3 sm:[grid-template-columns:repeat(2,minmax(0,1fr))]">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold text-brand-forest">Category</span>
            <input
              className="rounded-lg border border-brand-forest/20 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-green focus:outline-none"
              type="text"
              name="category"
              placeholder="Cleanup, planting, education"
              value={form.category}
              onChange={handleChange}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold text-brand-forest">Location</span>
            <input
              className="rounded-lg border border-brand-forest/20 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-green focus:outline-none"
              type="text"
              name="location"
              placeholder="Search by neighbourhood"
              value={form.location}
              onChange={handleChange}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold text-brand-forest">Theme</span>
            <input
              className="rounded-lg border border-brand-forest/20 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-green focus:outline-none"
              type="text"
              name="theme"
              placeholder="Biodiversity, climate, circularity"
              value={form.theme}
              onChange={handleChange}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold text-brand-forest">Date</span>
            <input
              className="rounded-lg border border-brand-forest/20 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-green focus:outline-none"
              type="date"
              name="date"
              value={form.date}
              onChange={handleChange}
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="submit" className="btn-primary" disabled={isLoading}>
            {isLoading ? 'Searching…' : 'Apply filters'}
          </button>
          <button
            type="button"
            className="rounded-md border border-brand-forest/20 bg-white px-3 py-2 text-sm font-semibold text-brand-forest shadow-sm"
            onClick={handleReset}
            disabled={isLoading}
          >
            Reset
          </button>
          <span className="text-xs text-brand-muted">
            {events.length ? `${events.length} event${events.length === 1 ? '' : 's'} shown` : 'No events to show yet'}
          </span>
        </div>
      </form>

      <div className="space-y-4">
        {isLoading ? (
          <p className="m-0 text-sm text-brand-muted">Loading opportunities…</p>
        ) : null}
        {!events.length && !isLoading ? (
          <p className="m-0 rounded-xl border border-dashed border-brand-forest/30 bg-white p-4 text-sm text-brand-muted">
            No events match these filters yet. Try widening your search or check back soon.
          </p>
        ) : null}
        {events.map((event) => {
          const state = actionStates[event.id] || { status: 'idle' };
          const isJoining = state.status === 'join-loading';
          const isLeaving = state.status === 'leave-loading';
          const alreadyJoined = event.isRegistered;
          const isFull = event.availableSlots <= 0;
          const canJoin = !alreadyJoined && !isFull && !isJoining && !isLeaving;
          return (
            <article
              key={event.id}
              className="flex flex-col gap-3 rounded-2xl border border-brand-forest/10 bg-white p-4 shadow-[0_12px_28px_rgba(47,133,90,0.08)]"
            >
              <header className="flex flex-col gap-1">
                <h4 className="m-0 text-base font-semibold text-brand-forest">{event.title}</h4>
                <p className="m-0 text-sm text-brand-muted">{summarize(event)}</p>
              </header>
              <dl className="grid gap-2 text-xs text-brand-muted [grid-template-columns:repeat(auto-fit,minmax(140px,1fr))]">
                <div>
                  <dt className="font-semibold text-brand-forest">When</dt>
                  <dd className="m-0">{formatDateRange(event)}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-brand-forest">Where</dt>
                  <dd className="m-0">{event.location}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-brand-forest">Spots left</dt>
                  <dd className="m-0">
                    {event.availableSlots > 0 ? `${event.availableSlots} open` : 'Full'}
                  </dd>
                </div>
              </dl>
              <div className="flex flex-wrap items-center gap-2">
                {!alreadyJoined ? (
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={!canJoin}
                    onClick={() => handleSignup(event.id)}
                  >
                    {isFull ? 'Full' : isJoining ? 'Joining…' : 'Sign up'}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="rounded-md border border-brand-forest/20 bg-white px-3 py-2 text-xs font-semibold text-brand-forest shadow-sm disabled:opacity-60"
                    disabled={isLeaving}
                    onClick={() => handleLeave(event.id)}
                  >
                    {isLeaving ? 'Leaving…' : 'Leave event'}
                  </button>
                )}
                {alreadyJoined ? (
                  <span className="text-xs font-semibold text-brand-green">You\u2019re confirmed!</span>
                ) : null}
                {isFull && !alreadyJoined ? (
                  <span className="text-xs text-brand-muted">This event reached capacity.</span>
                ) : null}
                {state.status === 'join-error' || state.status === 'leave-error' ? (
                  <span className="text-xs text-red-600">{state.message}</span>
                ) : null}
                {state.status === 'join-success' && !alreadyJoined ? (
                  <span className="text-xs font-semibold text-brand-green">{state.message}</span>
                ) : null}
                {state.status === 'leave-success' && alreadyJoined ? (
                  <span className="text-xs font-semibold text-brand-green">{state.message}</span>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
      {events.length ? (
        <p className="m-0 text-xs text-brand-muted">
          {totalAvailable
            ? `${totalAvailable} event${totalAvailable === 1 ? '' : 's'} still ${
                totalAvailable === 1 ? 'has' : 'have'
              } volunteer spots available.`
            : 'All listed events are currently full.'}
        </p>
      ) : null}
    </div>
  );
}
