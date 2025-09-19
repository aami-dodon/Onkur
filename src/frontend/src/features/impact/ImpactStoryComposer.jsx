import { useCallback, useEffect, useMemo, useState } from 'react';
import { submitImpactStory } from './impactApi';
import { fetchEventGallery } from '../event-gallery/galleryApi';

const MAX_MEDIA_SELECTION = 3;

export default function ImpactStoryComposer({ eventId, token, onSubmitted }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [selectedMedia, setSelectedMedia] = useState([]);
  const [status, setStatus] = useState({ state: 'idle', message: '' });
  const [mediaOptions, setMediaOptions] = useState([]);
  const [mediaState, setMediaState] = useState({ state: 'idle', message: '' });

  const canSubmit = useMemo(() => {
    return title.trim().length >= 6 && body.trim().length >= 40 && status.state !== 'loading';
  }, [title, body, status.state]);

  useEffect(() => {
    if (!eventId) {
      setMediaOptions([]);
      return;
    }
    let active = true;
    (async () => {
      setMediaState({ state: 'loading', message: '' });
      try {
        const response = await fetchEventGallery(eventId, { page: 1, pageSize: 6, token });
        if (!active) return;
        setMediaOptions(Array.isArray(response.media) ? response.media : []);
        setMediaState({ state: 'success', message: '' });
      } catch (error) {
        if (!active) return;
        setMediaState({ state: 'error', message: error.message || 'Unable to load gallery highlights.' });
      }
    })();
    return () => {
      active = false;
    };
  }, [eventId, token]);

  useEffect(() => {
    setTitle('');
    setBody('');
    setSelectedMedia([]);
    setStatus({ state: 'idle', message: '' });
  }, [eventId]);

  const toggleMedia = useCallback(
    (mediaId) => {
      setSelectedMedia((prev) => {
        if (prev.includes(mediaId)) {
          return prev.filter((value) => value !== mediaId);
        }
        if (prev.length >= MAX_MEDIA_SELECTION) {
          return prev;
        }
        return [...prev, mediaId];
      });
    },
    [],
  );

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      if (!canSubmit || !eventId) {
        return;
      }
      setStatus({ state: 'loading', message: '' });
      try {
        const result = await submitImpactStory({
          token,
          eventId,
          title: title.trim(),
          body: body.trim(),
          mediaIds: selectedMedia,
        });
        setStatus({ state: 'success', message: 'Thanks for sharing! Your story is now awaiting moderator review.' });
        setTitle('');
        setBody('');
        setSelectedMedia([]);
        onSubmitted?.(result.story);
      } catch (error) {
        setStatus({ state: 'error', message: error.message || 'Unable to submit your story right now.' });
      }
    },
    [body, canSubmit, eventId, onSubmitted, selectedMedia, title, token],
  );

  if (!token || !eventId) {
    return null;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-3xl border border-brand-forest/15 bg-white/90 p-5 shadow-sm">
      <header className="flex flex-col gap-1 text-left">
        <h3 className="m-0 text-lg font-semibold text-brand-forest">Share an impact story</h3>
        <p className="m-0 text-sm text-brand-muted">
          Celebrate the community you served. Stories go live after an admin review and appear in the event gallery.
        </p>
      </header>
      <label className="flex flex-col gap-2 text-sm font-medium text-brand-forest">
        Title
        <input
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="A memorable headline for your story"
          className="w-full rounded-xl border border-brand-green/40 bg-white px-4 py-2 text-sm text-brand-forest shadow-inner focus:border-brand-forest focus:outline-none focus:ring-2 focus:ring-brand-forest/40"
        />
      </label>
      <label className="flex flex-col gap-2 text-sm font-medium text-brand-forest">
        Story details
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={5}
          placeholder="Describe who was impacted, the moment that stood out, and how the community responded."
          maxLength={500}
          className="w-full rounded-xl border border-brand-green/40 bg-white px-4 py-3 text-sm text-brand-forest shadow-inner focus:border-brand-forest focus:outline-none focus:ring-2 focus:ring-brand-forest/40"
        />
        <span className="text-xs font-normal text-brand-muted">{body.trim().length} / 500 characters</span>
      </label>
      <section className="flex flex-col gap-2">
        <p className="m-0 text-sm font-semibold text-brand-forest">Highlight up to {MAX_MEDIA_SELECTION} gallery photos</p>
        {mediaState.state === 'error' ? (
          <p className="m-0 text-xs text-red-600">{mediaState.message}</p>
        ) : null}
        <div className="flex flex-wrap gap-3">
          {mediaOptions.length ? (
            mediaOptions.map((media) => {
              const checked = selectedMedia.includes(media.id);
              return (
                <button
                  key={media.id}
                  type="button"
                  onClick={() => toggleMedia(media.id)}
                  className={`flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                    checked ? 'border-brand-forest bg-brand-sand text-brand-forest' : 'border-brand-forest/20 bg-white text-brand-forest'
                  }`}
                >
                  <span className="inline-flex h-2.5 w-2.5 rounded-full border border-brand-forest bg-white">
                    {checked ? <span className="block h-full w-full rounded-full bg-brand-forest" /> : null}
                  </span>
                  {media.caption ? media.caption.slice(0, 24) : 'Gallery photo'}
                </button>
              );
            })
          ) : (
            <p className="m-0 text-xs text-brand-muted">
              {mediaState.state === 'loading' ? 'Loading gallery highlights…' : 'Upload photos to this gallery to link them here.'}
            </p>
          )}
        </div>
      </section>
      {status.state === 'error' ? (
        <p className="m-0 text-sm font-semibold text-red-600">{status.message}</p>
      ) : null}
      {status.state === 'success' ? (
        <p className="m-0 rounded-xl bg-brand-sand/80 px-3 py-2 text-sm font-medium text-brand-forest">{status.message}</p>
      ) : null}
      <button
        type="submit"
        disabled={!canSubmit}
        className="inline-flex items-center justify-center rounded-full bg-brand-forest px-6 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-brand-forest/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status.state === 'loading' ? 'Submitting…' : 'Submit story'}
      </button>
    </form>
  );
}
