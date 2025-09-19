import { useCallback, useEffect, useState } from 'react';
import { approveMedia, fetchModerationQueue, rejectMedia } from './galleryApi';

function ModerationCard({ item, onApprove, onReject }) {
  const [reason, setReason] = useState('');

  return (
    <article className="flex flex-col gap-4 rounded-3xl border border-brand-forest/10 bg-white/95 p-4 shadow-sm">
      <div className="flex gap-3">
        <img
          src={item.url}
          alt={item.caption || 'Pending media'}
          className="h-24 w-24 rounded-2xl object-cover"
        />
        <div className="flex flex-1 flex-col gap-2 text-sm text-brand-forest">
          <p className="m-0 font-semibold">{item.caption || 'No caption provided'}</p>
          <p className="m-0 text-xs uppercase tracking-[0.24em] text-brand-muted">
            Uploaded {new Date(item.createdAt).toLocaleString()}
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Optional rejection note"
          className="w-full rounded-2xl border border-brand-forest/20 px-3 py-2 text-sm text-brand-forest focus:border-brand-forest focus:outline-none"
          rows={2}
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onApprove(item.id)}
            className="rounded-full bg-brand-forest px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white"
          >
            Approve
          </button>
          <button
            type="button"
            onClick={() => onReject(item.id, reason)}
            className="rounded-full border border-red-400 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-red-500"
          >
            Reject
          </button>
        </div>
      </div>
    </article>
  );
}

export default function ModerationQueue({ token }) {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  const loadQueue = useCallback(async () => {
    if (!token) {
      return;
    }
    setStatus('loading');
    setMessage('');
    try {
      const response = await fetchModerationQueue({}, token);
      setItems(response.media || []);
      setStatus('success');
    } catch (error) {
      setStatus('error');
      setMessage(error.message || 'Unable to load moderation queue');
    }
  }, [token]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const handleApprove = useCallback(
    async (mediaId) => {
      try {
        await approveMedia(mediaId, token);
        setItems((prev) => prev.filter((item) => item.id !== mediaId));
      } catch (error) {
        setMessage(error.message || 'Approval failed');
      }
    },
    [token]
  );

  const handleReject = useCallback(
    async (mediaId, reason) => {
      try {
        await rejectMedia(mediaId, reason, token);
        setItems((prev) => prev.filter((item) => item.id !== mediaId));
      } catch (error) {
        setMessage(error.message || 'Rejection failed');
      }
    },
    [token]
  );

  if (!token) {
    return null;
  }

  return (
    <section className="flex flex-col gap-4 rounded-3xl border border-brand-forest/10 bg-brand-sand/40 p-5">
      <header className="flex flex-col gap-1">
        <h3 className="m-0 text-lg font-semibold text-brand-forest">Moderation queue</h3>
        <p className="m-0 text-sm text-brand-muted">
          Approve or reject pending uploads so galleries stay safe and inspiring.
        </p>
      </header>
      {status === 'loading' ? (
        <p className="text-sm text-brand-muted">Reviewing submissions…</p>
      ) : null}
      {status === 'error' ? <p className="text-sm text-red-600">{message}</p> : null}
      {items.length === 0 && status === 'success' ? (
        <p className="text-sm text-brand-muted">
          All clear! New submissions will appear here for review.
        </p>
      ) : null}
      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <ModerationCard
            key={item.id}
            item={item}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        ))}
      </div>
    </section>
  );
}
