import { useMemo } from 'react';

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(date);
}

export default function ImpactStoriesList({ stories = [], emptyState }) {
  const items = useMemo(() => stories.filter(Boolean), [stories]);

  if (!items.length) {
    return (
      <div className="flex flex-col gap-3 rounded-3xl border border-dashed border-brand-forest/20 bg-white/80 p-6 text-center">
        <span className="text-4xl">🌱</span>
        <p className="m-0 text-sm text-brand-muted">
          {emptyState ||
            'No impact stories yet. Share your experience to inspire future volunteers.'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {items.map((story) => (
        <article
          key={story.id}
          className="flex flex-col gap-3 rounded-3xl border border-brand-forest/15 bg-white/90 p-5 shadow-sm"
        >
          <header className="flex flex-col gap-1">
            <h4 className="m-0 text-base font-semibold text-brand-forest">{story.title}</h4>
            <p className="m-0 text-xs uppercase tracking-[0.2em] text-brand-muted">
              {story.authorName ? `By ${story.authorName}` : 'Community story'}
              {story.publishedAt
                ? ` · ${formatDate(story.publishedAt)}`
                : story.createdAt
                  ? ` · ${formatDate(story.createdAt)}`
                  : ''}
            </p>
          </header>
          <p className="m-0 text-sm leading-6 text-brand-muted">{story.excerpt || story.body}</p>
          {Array.isArray(story.mediaIds) && story.mediaIds.length ? (
            <div className="flex flex-wrap gap-2 text-xs text-brand-muted">
              {story.mediaIds.slice(0, 3).map((mediaId, index) => (
                <span
                  key={mediaId}
                  className="rounded-full bg-brand-sand px-3 py-1 font-semibold uppercase tracking-[0.18em] text-brand-forest"
                >
                  Highlight {index + 1}
                </span>
              ))}
              {story.mediaIds.length > 3 ? (
                <span className="rounded-full bg-brand-sand px-3 py-1 font-semibold uppercase tracking-[0.18em] text-brand-forest">
                  +{story.mediaIds.length - 3}
                </span>
              ) : null}
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}
