import { useEffect, useMemo, useState } from 'react';

const EMPTY_CATALOGS = {
  skills: [],
  interests: [],
  availability: [],
  locations: [],
  states: [],
};

function toTitleCase(value) {
  return String(value || '')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function arraysEqualIgnoreOrder(a = [], b = []) {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((value, index) => value === sortedB[index]);
}

function mergeOptionsWithSelections(options = [], selections = []) {
  const map = new Map(options.map((option) => [option.value, option.label]));
  const enriched = [...options];
  selections.forEach((value) => {
    if (!map.has(value)) {
      enriched.push({ value, label: toTitleCase(value) });
    }
  });
  return enriched;
}

function MultiTagField({
  label,
  helperText,
  placeholder,
  options = [],
  value = [],
  onChange,
  name,
}) {
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const optionLookup = useMemo(() => {
    const lookup = new Map();
    options.forEach((option) => lookup.set(option.value, option.label));
    return lookup;
  }, [options]);

  const filteredSuggestions = useMemo(() => {
    const query = inputValue.trim().toLowerCase();
    return options.filter((option) => {
      if (value.includes(option.value)) return false;
      if (!query) return true;
      return option.label.toLowerCase().includes(query);
    });
  }, [inputValue, options, value]);

  const handleAdd = (raw) => {
    const normalized = raw && raw.trim().toLowerCase();
    if (!normalized || value.includes(normalized)) {
      return;
    }
    onChange([...value, normalized]);
    setInputValue('');
  };

  const handleRemove = (item) => {
    onChange(value.filter((entry) => entry !== item));
  };

  const handleKeyDown = (event) => {
    if (['Enter', 'Tab', ','].includes(event.key)) {
      if (inputValue.trim()) {
        event.preventDefault();
        handleAdd(inputValue);
      }
    } else if (event.key === 'Backspace' && !inputValue) {
      onChange(value.slice(0, -1));
    }
  };

  const handleBlur = () => {
    if (inputValue.trim()) {
      handleAdd(inputValue);
    }
    // Delay closing suggestions to allow click events to register.
    setTimeout(() => setIsFocused(false), 100);
  };

  const getLabel = (item) => optionLookup.get(item) || toTitleCase(item);

  return (
    <label className="flex flex-col gap-2 text-sm">
      <span className="font-semibold text-brand-forest">{label}</span>
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-brand-forest/20 bg-white px-3 py-2 shadow-sm focus-within:border-brand-green focus-within:ring-1 focus-within:ring-brand-green/40">
        {value.map((item) => (
          <span
            key={item}
            className="flex items-center gap-1 rounded-full bg-brand-forest/10 px-2 py-1 text-xs font-medium text-brand-forest"
          >
            {getLabel(item)}
            <button
              type="button"
              className="rounded-full p-0.5 text-brand-muted transition hover:text-brand-forest"
              aria-label={`Remove ${getLabel(item)}`}
              onClick={() => handleRemove(item)}
            >
              ×
            </button>
          </span>
        ))}
        <div className="relative flex-1 min-w-[140px]">
          <input
            className="w-full border-0 bg-transparent text-sm text-brand-forest placeholder:text-brand-muted focus:outline-none"
            type="text"
            name={name}
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            onFocus={() => setIsFocused(true)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            placeholder={placeholder}
            autoComplete="off"
          />
          {isFocused && filteredSuggestions.length ? (
            <ul className="absolute z-10 mt-2 max-h-48 min-w-[220px] overflow-auto rounded-lg border border-brand-forest/10 bg-white shadow-lg">
              {filteredSuggestions.map((option) => (
                <li key={option.value}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-start px-3 py-2 text-left text-sm text-brand-forest transition hover:bg-brand-sand/70"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      handleAdd(option.value);
                      setIsFocused(false);
                    }}
                  >
                    {option.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
      {helperText ? <span className="text-xs text-brand-muted">{helperText}</span> : null}
    </label>
  );
}

function AvailabilityToggleGroup({ label, helperText, options = [], value = [], onChange }) {
  const toggle = (optionValue) => {
    if (value.includes(optionValue)) {
      onChange(value.filter((item) => item !== optionValue));
    } else {
      onChange([...value, optionValue]);
    }
  };

  return (
    <div className="flex flex-col gap-2 text-sm">
      <span className="font-semibold text-brand-forest">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = value.includes(option.value);
          return (
            <button
              type="button"
              key={option.value}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-forest/40 ${
                active
                  ? 'border-brand-forest bg-brand-forest text-white shadow-sm'
                  : 'border-brand-forest/20 bg-white text-brand-forest hover:border-brand-forest/60'
              }`}
              onClick={() => toggle(option.value)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {helperText ? <span className="text-xs text-brand-muted">{helperText}</span> : null}
    </div>
  );
}

function LocationSelectField({
  label,
  helperText,
  placeholder,
  options = [],
  value = '',
  onChange,
}) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!value) {
      setQuery('');
      return;
    }
    const match = options.find((option) => option.value === value || option.label === value);
    if (match) {
      setQuery(match.label);
    } else {
      setQuery(value);
    }
  }, [value, options]);

  const filteredOptions = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) {
      return options;
    }
    return options.filter((option) => option.label.toLowerCase().includes(search));
  }, [options, query]);

  const commitValue = (nextValue) => {
    const trimmed = nextValue.trim();
    if (!trimmed) {
      onChange('');
      setQuery('');
      return;
    }
    const normalized = toTitleCase(trimmed);
    onChange(normalized);
    setQuery(normalized);
  };

  return (
    <label className="flex flex-col gap-2 text-sm">
      <span className="font-semibold text-brand-forest">{label}</span>
      <div className="relative">
        <input
          className="w-full rounded-xl border border-brand-forest/20 bg-white px-3 py-2 text-sm text-brand-forest shadow-sm focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green/40"
          type="text"
          value={query}
          placeholder={placeholder}
          onFocus={() => setIsOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onBlur={() => {
            setTimeout(() => setIsOpen(false), 100);
            commitValue(query);
          }}
        />
        {isOpen && filteredOptions.length ? (
          <ul className="absolute z-10 mt-2 max-h-48 w-full overflow-auto rounded-lg border border-brand-forest/10 bg-white shadow-lg">
            {filteredOptions.map((option) => (
              <li key={option.value}>
                <button
                  type="button"
                  className="flex w-full items-center justify-start px-3 py-2 text-left text-sm text-brand-forest transition hover:bg-brand-sand/70"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onChange(option.value);
                    setQuery(option.label);
                    setIsOpen(false);
                  }}
                >
                  {option.label}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {helperText ? <span className="text-xs text-brand-muted">{helperText}</span> : null}
    </label>
  );
}

function StateSelectField({ label, helperText, options = [], value = '', onChange }) {
  return (
    <label className="flex flex-col gap-2 text-sm">
      <span className="font-semibold text-brand-forest">{label}</span>
      <select
        className="rounded-xl border border-brand-forest/20 bg-white px-3 py-2 text-sm text-brand-forest shadow-sm focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green/40"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Select state</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {helperText ? <span className="text-xs text-brand-muted">{helperText}</span> : null}
    </label>
  );
}

export default function ProfileEditor({ profile, catalogs, onSave }) {
  const [form, setForm] = useState({
    skills: [],
    interests: [],
    availability: [],
    location: '',
    state: '',
    bio: '',
  });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);

  const mergedCatalogs = catalogs || EMPTY_CATALOGS;

  useEffect(() => {
    if (!profile) return;
    setForm({
      skills: Array.isArray(profile.skills) ? profile.skills : [],
      interests: Array.isArray(profile.interests) ? profile.interests : [],
      availability: Array.isArray(profile.availability) ? profile.availability : [],
      location: profile.location || '',
      state: profile.state || '',
      bio: profile.bio || '',
    });
  }, [profile]);

  const skillOptions = useMemo(
    () => mergeOptionsWithSelections(mergedCatalogs.skills, form.skills),
    [mergedCatalogs.skills, form.skills]
  );
  const interestOptions = useMemo(
    () => mergeOptionsWithSelections(mergedCatalogs.interests, form.interests),
    [mergedCatalogs.interests, form.interests]
  );
  const availabilityOptions = mergedCatalogs.availability || [];
  const locationOptions = useMemo(
    () => mergeOptionsWithSelections(mergedCatalogs.locations, form.location ? [form.location] : []),
    [mergedCatalogs.locations, form.location]
  );
  const stateOptions = mergedCatalogs.states || [];

  const hasChanges = useMemo(() => {
    if (!profile) return false;
    return (
      !arraysEqualIgnoreOrder(form.skills, profile.skills || []) ||
      !arraysEqualIgnoreOrder(form.interests, profile.interests || []) ||
      !arraysEqualIgnoreOrder(form.availability, profile.availability || []) ||
      (form.location || '') !== (profile.location || '') ||
      (form.state || '') !== (profile.state || '') ||
      (form.bio || '') !== (profile.bio || '')
    );
  }, [form, profile]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!onSave || !profile) return;
    setSaving(true);
    setStatus(null);
    try {
      const payload = {
        skills: form.skills,
        interests: form.interests,
        availability: form.availability,
        location: form.location,
        state: form.state,
        bio: form.bio,
      };
      const result = await onSave(payload);
      const nextProfile = result?.profile || result;
      setStatus({ type: 'success', message: 'Profile saved successfully.' });
      if (nextProfile) {
        setForm({
          skills: Array.isArray(nextProfile.skills) ? nextProfile.skills : [],
          interests: Array.isArray(nextProfile.interests) ? nextProfile.interests : [],
          availability: Array.isArray(nextProfile.availability) ? nextProfile.availability : [],
          location: nextProfile.location || '',
          state: nextProfile.state || '',
          bio: nextProfile.bio || '',
        });
      }
    } catch (error) {
      setStatus({
        type: 'error',
        message: error.message || 'Unable to update your profile.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
      <div className="grid gap-4">
        <MultiTagField
          label="Skills"
          helperText="Add all the talents you want coordinators to know about."
          placeholder="Add a skill and press Enter"
          options={skillOptions}
          value={form.skills}
          onChange={(next) => setForm((prev) => ({ ...prev, skills: next }))}
          name="skills"
        />
        <MultiTagField
          label="Interests"
          helperText="What causes energize you? Add as many interests as you like."
          placeholder="Add an interest"
          options={interestOptions}
          value={form.interests}
          onChange={(next) => setForm((prev) => ({ ...prev, interests: next }))}
          name="interests"
        />
        <AvailabilityToggleGroup
          label="Availability"
          helperText="Choose all the time windows you can typically support."
          options={availabilityOptions}
          value={form.availability}
          onChange={(next) => setForm((prev) => ({ ...prev, availability: next }))}
        />
        <LocationSelectField
          label="Location"
          helperText="Pick your city so we can recommend nearby opportunities."
          placeholder="Search or add your city"
          options={locationOptions}
          value={form.location}
          onChange={(next) => setForm((prev) => ({ ...prev, location: next }))}
        />
        <StateSelectField
          label="State"
          helperText="States help us route you to the right regional coordinator."
          options={stateOptions}
          value={form.state}
          onChange={(next) => setForm((prev) => ({ ...prev, state: next }))}
        />
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-semibold text-brand-forest">Bio</span>
          <textarea
            className="min-h-[96px] rounded-xl border border-brand-forest/20 bg-white px-3 py-2 text-sm text-brand-forest shadow-sm focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green/40"
            name="bio"
            placeholder="Share a sentence about why you volunteer."
            value={form.bio}
            onChange={(event) => setForm((prev) => ({ ...prev, bio: event.target.value }))}
          />
        </label>
      </div>
      {status ? (
        <p
          className={`m-0 text-sm ${
            status.type === 'success' ? 'text-brand-green' : 'text-red-600'
          }`}
        >
          {status.message}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" className="btn-primary" disabled={saving || !hasChanges}>
          {saving ? 'Saving…' : 'Save profile'}
        </button>
        {!hasChanges ? (
          <span className="text-xs text-brand-muted">Make an update to enable saving.</span>
        ) : null}
      </div>
    </form>
  );
}
