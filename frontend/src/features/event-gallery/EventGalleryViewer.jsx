import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import GalleryLightbox from './GalleryLightbox';
import { fetchEventGallery } from './galleryApi';

function MediaCard({ media, onSelect }) {
  const tags = Array.isArray(media.tags) ? media.tags : [];
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group flex flex-col gap-3 rounded-3xl border border-brand-forest/10 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl bg-brand-sand">
        <img
          src={media.url}
          alt={media.caption || 'Event gallery media'}
          loading="lazy"
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
        />
      </div>
      <div className="flex flex-col gap-2 px-4 pb-4 text-left">
        {media.caption ? (
          <p className="m-0 line-clamp-3 text-sm text-brand-muted">{media.caption}</p>
        ) : (
          <p className="m-0 text-xs uppercase tracking-[0.22em] text-brand-muted">Tap to view</p>
        )}
        {tags.length ? (
          <div className="flex flex-wrap gap-2">
            {tags.slice(0, 3).map((tag) => (
              <span
                key={`${tag.type}-${tag.id}`}
                className="rounded-full bg-brand-sand px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-forest"
              >
                {tag.label || tag.type}
              </span>
            ))}
            {tags.length > 3 ? (
              <span className="rounded-full bg-brand-sand px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-forest">
                +{tags.length - 3}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </button>
  );
}

function GalleryGrid({ items, onSelect, isLoading }) {
  if (!items.length && isLoading) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-brand-forest/20 bg-white/70 p-10 text-center">
        <span className="text-4xl">✨</span>
        <p className="m-0 text-sm text-brand-muted">Loading gallery moments…</p>
      </div>
    );
  }
  if (!items.length) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-brand-forest/20 bg-white/70 p-10 text-center">
        <span className="text-4xl">📸</span>
        <p className="m-0 text-sm text-brand-muted">No approved media yet. Be the first to share impact from this event.</p>
      </div>
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((media, index) => (
        <MediaCard key={media.id} media={media} onSelect={() => onSelect(index)} />
      ))}
    </div>
  );
}

export default function EventGalleryViewer({ eventId, token, refreshSignal = 0 }) {
  const [items, setItems] = useState([]);
  const [eventInfo, setEventInfo] = useState(null);
  const [metrics, setMetrics] = useState({ viewCount: 0, lastViewedAt: null });
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(null);
  const observerRef = useRef(null);
  const sentinelRef = useRef(null);

  useEffect(() => {
    setItems([]);
    setEventInfo(null);
    setMetrics({ viewCount: 0, lastViewedAt: null });
    setPage(0);
    setHasMore(true);
    setStatus('idle');
    setError('');
    setSelectedIndex(null);
  }, [eventId, refreshSignal]);

  const loadPage = useCallback(
    async (nextPage) => {
      if (!eventId || status === 'loading') {
        return;
      }
      setStatus('loading');
      setError('');
      try {
        const response = await fetchEventGallery(eventId, {
          page: nextPage,
          pageSize: 12,
          token,
        });
        setItems((prev) => (nextPage === 1 ? response.media || [] : [...prev, ...(response.media || [])]));
        setEventInfo(response.event || null);
        setMetrics(response.metrics || { viewCount: 0, lastViewedAt: null });
        setHasMore(Boolean(response.hasMore));
        setPage(response.page || nextPage);
        setStatus('success');
      } catch (err) {
        setError(err.message || 'Unable to load gallery');
        setStatus('error');
      }
    },
    [eventId, status, token],
  );

  useEffect(() => {
    if (!eventId) {
      return;
    }
    if (page === 0 && status !== 'loading') {
      loadPage(1);
    }
  }, [eventId, loadPage, page, status]);

  useEffect(() => {
    if (!hasMore) {
      return;
    }
    if (!sentinelRef.current) {
      return;
    }
    if (observerRef.current) {
      observerRef.current.disconnect();
    }
    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          loadPage(page + 1);
        }
      });
    }, { threshold: 1 });
    observerRef.current.observe(sentinelRef.current);
    return () => {
      observerRef.current?.disconnect();
    };
  }, [hasMore, loadPage, page]);

  const activeMedia = useMemo(() => {
    if (selectedIndex === null || selectedIndex < 0 || selectedIndex >= items.length) {
      return null;
    }
    return items[selectedIndex];
  }, [items, selectedIndex]);

  if (!eventId) {
    return (
      <div className="rounded-3xl border border-brand-forest/10 bg-white/80 p-8 text-center text-brand-muted">
        Choose an event to explore its gallery.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {eventInfo ? (
        <header className="flex flex-col gap-2">
          <h3 className="m-0 text-lg font-semibold text-brand-forest">{eventInfo.title}</h3>
          <p className="m-0 text-xs uppercase tracking-[0.28em] text-brand-muted">
            {metrics.viewCount ? `${metrics.viewCount} views · ` : ''}
            {eventInfo.category ? `${eventInfo.category} · ` : ''}
            {eventInfo.theme || 'Gallery story'}
          </p>
          {Array.isArray(eventInfo.sponsors) && eventInfo.sponsors.length ? (
            <div className="flex flex-wrap items-center gap-2">
              {eventInfo.sponsors.map((sponsor) => (
                <span
                  key={sponsor.sponsorId || sponsor.orgName}
                  className="inline-flex items-center gap-2 rounded-full bg-brand-sand px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-forest"
                >
                  {sponsor.logoUrl ? (
                    <img src={sponsor.logoUrl} alt={sponsor.orgName} className="h-5 w-5 rounded-full object-cover" />
                  ) : null}
                  {sponsor.orgName}
                </span>
              ))}
            </div>
          ) : null}
        </header>
      ) : null}
      {status === 'error' ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : null}
      <GalleryGrid items={items} onSelect={(index) => setSelectedIndex(index)} isLoading={status === 'loading' && !items.length} />
      {hasMore ? (
        <div ref={sentinelRef} className="h-1 w-full" aria-hidden="true" />
      ) : null}
      {status === 'loading' ? (
        <p className="text-center text-sm text-brand-muted">Loading more moments…</p>
      ) : null}
      <GalleryLightbox
        media={activeMedia}
        onClose={() => setSelectedIndex(null)}
        onPrev={() => setSelectedIndex((prev) => (prev === null ? null : Math.max(0, prev - 1)))}
        onNext={() => setSelectedIndex((prev) => (prev === null ? null : Math.min(items.length - 1, prev + 1)))}
      />
    </div>
  );
}
