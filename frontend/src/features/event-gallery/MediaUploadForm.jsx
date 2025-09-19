import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchTagOptions, uploadEventMedia } from './galleryApi';

function SelectField({ label, children }) {
  return (
    <label className="flex flex-col gap-2 text-sm text-brand-forest">
      <span className="font-semibold uppercase tracking-[0.22em] text-brand-muted">{label}</span>
      {children}
    </label>
  );
}

function TagCheckboxList({ options, selected, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const id = `${option.type}-${option.id}`;
        const isChecked = selected.some((tag) => tag.id === option.id && tag.type === option.type);
        return (
          <label
            key={id}
            className={`cursor-pointer rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${
              isChecked
                ? 'border-brand-forest bg-brand-sand text-brand-forest'
                : 'border-brand-forest/20 text-brand-muted'
            }`}
          >
            <input
              type="checkbox"
              checked={isChecked}
              onChange={(event) => {
                if (event.target.checked) {
                  onChange([...selected, option]);
                } else {
                  onChange(
                    selected.filter((tag) => !(tag.id === option.id && tag.type === option.type))
                  );
                }
              }}
              className="sr-only"
            />
            {option.label}
          </label>
        );
      })}
    </div>
  );
}

function CommunityTagEditor({ communityTags, onAdd, onRemove }) {
  const [value, setValue] = useState('');

  const handleAdd = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setValue('');
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Add a community or neighborhood"
          className="w-full rounded-2xl border border-brand-forest/30 bg-white px-3 py-2 text-sm text-brand-forest focus:border-brand-forest focus:outline-none"
        />
        <button
          type="button"
          onClick={handleAdd}
          className="rounded-full bg-brand-forest px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white"
        >
          Add
        </button>
      </div>
      {communityTags.length ? (
        <div className="flex flex-wrap gap-2">
          {communityTags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => onRemove(tag.id)}
              className="rounded-full bg-brand-sand px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-forest"
            >
              {tag.label} ✕
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function MediaUploadForm({ token, events = [], onUploaded }) {
  const [selectedEvent, setSelectedEvent] = useState('');
  const [caption, setCaption] = useState('');
  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null);
  const [volunteerTags, setVolunteerTags] = useState([]);
  const [sponsorTags, setSponsorTags] = useState([]);
  const [communityTags, setCommunityTags] = useState([]);
  const [options, setOptions] = useState({ volunteers: [], sponsors: [], communities: [] });
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  const eventOptions = useMemo(() => events.filter(Boolean), [events]);

  useEffect(() => {
    if (!selectedEvent || !token) {
      setOptions({ volunteers: [], sponsors: [], communities: [] });
      setVolunteerTags([]);
      setSponsorTags([]);
      setCommunityTags([]);
      return;
    }
    let isMounted = true;
    (async () => {
      try {
        const response = await fetchTagOptions(selectedEvent, token);
        if (!isMounted) return;
        setOptions({
          volunteers: response.volunteers || [],
          sponsors: response.sponsors || [],
          communities: response.communities || [],
        });
        setVolunteerTags([]);
        setSponsorTags([]);
        setCommunityTags(response.communities || []);
      } catch (error) {
        if (isMounted) {
          setOptions({ volunteers: [], sponsors: [], communities: [] });
          setVolunteerTags([]);
          setSponsorTags([]);
          setCommunityTags([]);
          setMessage(error.message || 'Unable to load tag options');
        }
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [selectedEvent, token]);

  const canSubmit = useMemo(
    () => selectedEvent && file && status !== 'loading',
    [file, selectedEvent, status]
  );

  const handleFileChange = useCallback((event) => {
    const selected = event.target.files?.[0];
    if (!selected) {
      setFile(null);
      return;
    }
    setFile(selected);
  }, []);

  const handleAddCommunity = useCallback(
    (label) => {
      const id = `community:${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
      if (communityTags.some((tag) => tag.id === id)) {
        return;
      }
      setCommunityTags([...communityTags, { type: 'COMMUNITY', id, label }]);
    },
    [communityTags]
  );

  const handleRemoveCommunity = useCallback((id) => {
    setCommunityTags((prev) => prev.filter((tag) => tag.id !== id));
  }, []);

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      if (!canSubmit) {
        return;
      }
      setStatus('loading');
      setMessage('Uploading photo for review…');
      try {
        const tags = [...volunteerTags, ...sponsorTags, ...communityTags];
        const response = await uploadEventMedia(
          selectedEvent,
          {
            file,
            caption,
            tags,
          },
          token
        );
        setStatus('success');
        setMessage('Photo submitted for moderation. You will get an email when it is reviewed.');
        setCaption('');
        setFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        if (typeof onUploaded === 'function' && response.media) {
          onUploaded(response.media);
        }
      } catch (error) {
        setStatus('error');
        setMessage(error.message || 'Upload failed. Please try again.');
      }
    },
    [
      canSubmit,
      caption,
      communityTags,
      file,
      onUploaded,
      selectedEvent,
      sponsorTags,
      token,
      volunteerTags,
    ]
  );

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-5 rounded-3xl border border-brand-forest/10 bg-white/90 p-5"
    >
      <header className="flex flex-col gap-1">
        <h3 className="m-0 text-lg font-semibold text-brand-forest">Share your impact story</h3>
        <p className="m-0 text-sm text-brand-muted">
          Upload photos from events you attended so moderators can spotlight them.
        </p>
      </header>
      <SelectField label="Event">
        <select
          value={selectedEvent}
          onChange={(event) => setSelectedEvent(event.target.value)}
          className="w-full rounded-2xl border border-brand-forest/30 bg-white px-3 py-2 text-sm text-brand-forest focus:border-brand-forest focus:outline-none"
        >
          <option value="">Select an event</option>
          {eventOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.title}
            </option>
          ))}
        </select>
      </SelectField>
      <SelectField label="Photo">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="w-full rounded-2xl border border-brand-forest/30 bg-white px-3 py-2 text-sm text-brand-forest file:mr-3 file:rounded-full file:border-0 file:bg-brand-forest file:px-4 file:py-2 file:text-xs file:font-semibold file:uppercase file:tracking-[0.2em] file:text-white focus:border-brand-forest focus:outline-none"
        />
      </SelectField>
      <SelectField label="Caption">
        <textarea
          value={caption}
          onChange={(event) => setCaption(event.target.value.slice(0, 400))}
          rows={3}
          placeholder="Describe the moment, the impact, or a quote from participants (max 400 characters)."
          className="w-full rounded-2xl border border-brand-forest/30 bg-white px-3 py-2 text-sm text-brand-forest focus:border-brand-forest focus:outline-none"
        />
      </SelectField>
      {options.volunteers.length ? (
        <SelectField label="Tag volunteers">
          <TagCheckboxList
            options={options.volunteers.map((item) => ({ ...item, type: 'VOLUNTEER' }))}
            selected={volunteerTags}
            onChange={setVolunteerTags}
          />
        </SelectField>
      ) : null}
      {options.sponsors.length ? (
        <SelectField label="Tag sponsors">
          <TagCheckboxList
            options={options.sponsors.map((item) => ({ ...item, type: 'SPONSOR' }))}
            selected={sponsorTags}
            onChange={setSponsorTags}
          />
        </SelectField>
      ) : null}
      <SelectField label="Communities celebrated">
        <CommunityTagEditor
          communityTags={communityTags}
          onAdd={handleAddCommunity}
          onRemove={handleRemoveCommunity}
        />
      </SelectField>
      <button
        type="submit"
        disabled={!canSubmit}
        className="mt-2 inline-flex items-center justify-center rounded-full bg-brand-forest px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white disabled:cursor-not-allowed disabled:bg-brand-muted"
      >
        {status === 'loading' ? 'Uploading…' : 'Submit for review'}
      </button>
      {message ? (
        <p className={`m-0 text-sm ${status === 'error' ? 'text-red-600' : 'text-brand-forest'}`}>
          {message}
        </p>
      ) : null}
    </form>
  );
}
