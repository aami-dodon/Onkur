import { useEffect, useMemo, useState } from 'react';
import useDocumentTitle from '../../lib/useDocumentTitle';
import { fetchGalleryEvents } from './galleryApi';
import EventGalleryViewer from './EventGalleryViewer';

export default function PublicGalleryPage() {
  const [events, setEvents] = useState([]);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [selectedEventId, setSelectedEventId] = useState('');

  useDocumentTitle('Onkur | Event galleries');

  useEffect(() => {
    let isMounted = true;
    (async () => {
      setStatus('loading');
      try {
        const response = await fetchGalleryEvents({ pageSize: 18 });
        if (!isMounted) return;
        const list = response.events || [];
        setEvents(list);
        if (list.length) {
          setSelectedEventId(list[0].id);
        }
        setStatus('success');
      } catch (err) {
        if (!isMounted) return;
        setStatus('error');
        setError(err.message || 'Unable to load galleries');
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const selectedEvent = useMemo(() => events.find((event) => event.id === selectedEventId) || null, [events, selectedEventId]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-10 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-3 text-center">
        <h1 className="m-0 font-display text-3xl font-semibold text-brand-forest sm:text-4xl">Impact in full color</h1>
        <p className="m-0 text-base text-brand-muted sm:text-lg">
          Browse approved galleries from recent Onkur events. Every story highlights volunteers, sponsors, and communities
          thriving together.
        </p>
      </header>
      {status === 'error' ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">{error}</div>
      ) : null}
      <section className="flex flex-col gap-4">
        <h2 className="m-0 text-lg font-semibold text-brand-forest">Featured galleries</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <button
              type="button"
              key={event.id}
              onClick={() => setSelectedEventId(event.id)}
              className={`flex flex-col gap-3 rounded-3xl border px-4 py-5 text-left shadow-sm transition ${
                selectedEventId === event.id
                  ? 'border-brand-forest bg-brand-sand/70 shadow-lg'
                  : 'border-brand-forest/20 bg-white hover:border-brand-forest/40'
              }`}
            >
              <h3 className="m-0 text-base font-semibold text-brand-forest">{event.title}</h3>
              <p className="m-0 text-xs uppercase tracking-[0.24em] text-brand-muted">
                {event.mediaCount} photos · {event.theme || 'Community impact'}
              </p>
              <p className="m-0 text-sm text-brand-muted">{event.location || 'Across our communities'}</p>
            </button>
          ))}
        </div>
      </section>
      <section className="flex flex-col gap-6">
        <EventGalleryViewer eventId={selectedEvent?.id} token={null} />
      </section>
    </div>
  );
}
