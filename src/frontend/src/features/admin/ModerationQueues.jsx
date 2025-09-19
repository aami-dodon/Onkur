import { useMemo } from 'react';
import DashboardCard from '../dashboard/DashboardCard';

const QUEUE_TYPES = [
  { key: 'events', label: 'Events' },
  { key: 'sponsors', label: 'Sponsors' },
  { key: 'media', label: 'Galleries' },
];

function formatDate(value) {
  if (!value) return 'TBD';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'TBD';
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export default function ModerationQueues({
  type,
  queue,
  notes,
  onTypeChange,
  onApprove,
  onReject,
  onNoteChange,
  loading,
  error,
}) {
  const activeType = useMemo(() => type || 'events', [type]);
  const items = queue?.items || [];

  return (
    <DashboardCard
      title="Moderation center"
      description="Approve events, sponsor applications, and gallery submissions from a single hub."
      className="md:col-span-full"
    >
      <div className="flex flex-wrap gap-2">
        {QUEUE_TYPES.map((entry) => {
          const active = entry.key === activeType;
          return (
            <button
              key={entry.key}
              type="button"
              onClick={() => onTypeChange(entry.key)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                active
                  ? 'bg-brand-forest text-white shadow'
                  : 'bg-white text-brand-forest shadow-sm hover:bg-brand-sand/60'
              }`}
            >
              {entry.label}
            </button>
          );
        })}
      </div>

      {error ? <p className="mt-4 text-sm font-medium text-red-600">{error}</p> : null}
      {loading ? <p className="mt-4 text-sm text-brand-muted">Loading moderation queue…</p> : null}

      {!loading && !items.length ? (
        <p className="mt-4 text-sm text-brand-muted">No pending items. Enjoy the calm! 🌿</p>
      ) : null}

      <ul className="mt-4 grid list-none gap-4 p-0">
        {items.map((item) => {
          const noteValue = notes[item.id] || '';
          return (
            <li key={item.id} className="rounded-xl border border-brand-green/30 bg-white/90 p-4 shadow-sm">
              <header className="flex flex-col gap-1 border-b border-brand-green/20 pb-3">
                <h3 className="m-0 font-display text-lg font-semibold text-brand-forest">
                  {activeType === 'events' && item.title}
                  {activeType === 'sponsors' && item.orgName}
                  {activeType === 'media' && (item.eventTitle || 'Gallery submission')}
                </h3>
                <p className="m-0 text-xs uppercase tracking-[0.2em] text-brand-muted">
                  {activeType === 'events' && 'Event submission'}
                  {activeType === 'sponsors' && 'Sponsor application'}
                  {activeType === 'media' && 'Gallery item'}
                </p>
              </header>

              <div className="mt-3 space-y-2 text-sm text-brand-muted">
                {activeType === 'events' ? (
                  <>
                    <p className="m-0">Submitted by: {item.createdByName || 'Unknown'} · {item.createdByEmail || 'N/A'}</p>
                    <p className="m-0">Schedule: {formatDate(item.dateStart)} → {formatDate(item.dateEnd)}</p>
                    <p className="m-0">Location: {item.location || 'TBD'}</p>
                    {item.approvalNote ? (
                      <p className="m-0 text-amber-700">Previous note: {item.approvalNote}</p>
                    ) : null}
                  </>
                ) : null}

                {activeType === 'sponsors' ? (
                  <>
                    <p className="m-0">Contact: {item.contactName || 'Team lead'} · {item.contactEmail || 'N/A'}</p>
                    <p className="m-0">Applied on: {formatDate(item.appliedAt)}</p>
                  </>
                ) : null}

                {activeType === 'media' ? (
                  <>
                    <p className="m-0">Uploaded by: {item.uploaderId}</p>
                    <p className="m-0">Submitted: {formatDate(item.submittedAt)}</p>
                    {item.caption ? <p className="m-0">Caption: {item.caption}</p> : null}
                  </>
                ) : null}
              </div>

              <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <label className="flex-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-muted">
                  Moderation note
                  <input
                    type="text"
                    value={noteValue}
                    onChange={(event) => onNoteChange(item.id, event.target.value)}
                    placeholder={activeType === 'events' ? 'Optional feedback for managers' : 'Optional note'}
                    className="mt-1 w-full rounded-md border border-brand-green/40 bg-white px-3 py-2 text-sm text-brand-forest focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/40"
                  />
                </label>
                <div className="flex gap-2 md:justify-end">
                  <button
                    type="button"
                    onClick={() => onReject(activeType, item.id, noteValue)}
                    className="rounded-full border border-brand-green/40 px-4 py-2 text-sm font-semibold text-brand-forest transition hover:bg-brand-sand/70"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    onClick={() => onApprove(activeType, item.id)}
                    className="rounded-full bg-brand-forest px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-brand-forest/90"
                  >
                    Approve
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </DashboardCard>
  );
}
