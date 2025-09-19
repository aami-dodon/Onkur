import { useEffect } from 'react';

function TagChip({ tag }) {
  if (!tag) return null;
  const tone =
    tag.type === 'SPONSOR' ? 'bg-white text-brand-forest' : 'bg-brand-sand text-brand-forest';
  const label = tag.label || tag.type;
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${tone}`}
    >
      {label}
    </span>
  );
}

export default function GalleryLightbox({ media, onClose, onPrev, onNext }) {
  useEffect(() => {
    function handleKey(event) {
      if (event.key === 'Escape') {
        onClose?.();
      }
      if (event.key === 'ArrowLeft') {
        onPrev?.();
      }
      if (event.key === 'ArrowRight') {
        onNext?.();
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('keydown', handleKey);
    };
  }, [onClose, onNext, onPrev]);

  if (!media) {
    return null;
  }

  const tags = Array.isArray(media.tags) ? media.tags : [];

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col bg-black/80 p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label="Gallery lightbox"
    >
      <div className="flex justify-between text-white">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-white/40 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em]"
        >
          Close
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onPrev}
            className="rounded-full border border-white/40 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em]"
          >
            Prev
          </button>
          <button
            type="button"
            onClick={onNext}
            className="rounded-full border border-white/40 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em]"
          >
            Next
          </button>
        </div>
      </div>
      <div className="mt-4 flex grow flex-col items-center overflow-y-auto">
        <img
          src={media.url}
          alt={media.caption || 'Event gallery media'}
          className="max-h-[60vh] w-full max-w-4xl rounded-3xl object-contain shadow-2xl"
        />
        <div className="mt-6 flex w-full max-w-3xl flex-col gap-3 rounded-3xl bg-white/95 p-5 text-brand-forest">
          {media.caption ? <p className="m-0 text-sm sm:text-base">{media.caption}</p> : null}
          {tags.length ? (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <TagChip key={`${tag.type}-${tag.id}`} tag={tag} />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
