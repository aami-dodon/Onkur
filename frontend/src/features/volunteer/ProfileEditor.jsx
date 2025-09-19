import { useEffect, useMemo, useState } from 'react';

function normalizeValue(value) {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).trim().toLowerCase();
}

function formatLabel(value) {
  return String(value)
    .split(/\s+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function mergeSelections(baseOptions = [], selectedValues = []) {
  const map = new Map();
  baseOptions.forEach((option) => {
    if (!option || !option.value) return;
    map.set(option.value, {
      value: option.value,
      label: option.label || formatLabel(option.value),
    });
  });
  selectedValues.forEach((value) => {
    if (!map.has(value)) {
      map.set(value, { value, label: formatLabel(value) });
    }
  });
  return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
}

function sameSet(a = [], b = []) {
  if (a.length !== b.length) return false;
  const compare = new Set(b);
  return a.every((value) => compare.has(value));
}

function resolveLabel(options = [], value) {
  const option = options.find((item) => item.value === value);
  return option ? option.label : formatLabel(value);
}

function mapProfileList(values) {
  if (!Array.isArray(values)) {
    return [];
  }
  return values
    .map((entry) => normalizeValue(entry))
    .filter((entry, index, array) => entry && array.indexOf(entry) === index);
}

export default function ProfileEditor({
  profile,
  onSave,
  lookups = { skills: [], interests: [], availability: [], states: [] },
  onRequestCities,
  initialCities = [],
}) {
  const [form, setForm] = useState({
    skills: [],
    interests: [],
    availability: '',
    stateCode: '',
    citySlug: '',
    bio: '',
  });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);
  const [customSkill, setCustomSkill] = useState('');
  const [customInterest, setCustomInterest] = useState('');
  const [cityOptions, setCityOptions] = useState(Array.isArray(initialCities) ? initialCities : []);

  const profileSkills = useMemo(() => mapProfileList(profile?.skills), [profile]);
  const profileInterests = useMemo(() => mapProfileList(profile?.interests), [profile]);

  const skillOptions = useMemo(
    () => mergeSelections(lookups?.skills || [], form.skills),
    [lookups?.skills, form.skills]
  );
  const interestOptions = useMemo(
    () => mergeSelections(lookups?.interests || [], form.interests),
    [lookups?.interests, form.interests]
  );

  const hasChanges = useMemo(() => {
    if (!profile) return false;
    if (!sameSet(form.skills, profileSkills)) return true;
    if (!sameSet(form.interests, profileInterests)) return true;
    if ((form.availability || '') !== (profile.availability || '')) return true;
    if ((form.stateCode || '') !== (profile.stateCode || '')) return true;
    if ((form.citySlug || '') !== (profile.citySlug || '')) return true;
    if ((form.bio || '') !== (profile.bio || '')) return true;
    return false;
  }, [form, profile, profileSkills, profileInterests]);

  useEffect(() => {
    if (!profile) return;
    setForm({
      skills: profileSkills,
      interests: profileInterests,
      availability: profile.availability || '',
      stateCode: profile.stateCode || '',
      citySlug: profile.citySlug || '',
      bio: profile.bio || '',
    });
    setStatus(null);
  }, [profile, profileSkills, profileInterests]);

  useEffect(() => {
    if (Array.isArray(initialCities)) {
      setCityOptions(initialCities);
    }
  }, [initialCities]);

  useEffect(() => {
    let cancelled = false;
    const loadCities = async () => {
      if (!form.stateCode) {
        setCityOptions([]);
        return;
      }
      if (typeof onRequestCities !== 'function') {
        return;
      }
      try {
        const response = await onRequestCities(form.stateCode);
        if (cancelled) return;
        const options = Array.isArray(response)
          ? response
          : Array.isArray(response?.cities)
            ? response.cities
            : [];
        setCityOptions(options);
        if (!options.some((option) => option.value === form.citySlug)) {
          setForm((prev) => ({ ...prev, citySlug: '' }));
        }
      } catch (error) {
        if (!cancelled) {
          setCityOptions([]);
        }
      }
    };
    loadCities();
    return () => {
      cancelled = true;
    };
  }, [form.stateCode, form.citySlug, onRequestCities]);

  const toggleSelection = (field, value) => {
    const normalized = normalizeValue(value);
    if (!normalized) return;
    setForm((prev) => {
      const current = new Set(prev[field]);
      if (current.has(normalized)) {
        current.delete(normalized);
      } else {
        current.add(normalized);
      }
      return { ...prev, [field]: Array.from(current) };
    });
  };

  const handleAddCustom = (field, value, setter) => {
    const normalized = normalizeValue(value);
    if (!normalized) {
      setter('');
      return;
    }
    setForm((prev) => {
      if (prev[field].includes(normalized)) {
        return prev;
      }
      const next = [...prev[field], normalized];
      return { ...prev, [field]: next };
    });
    setter('');
  };

  const handleSelectChange = (event) => {
    const { name, value } = event.target;
    if (name === 'stateCode') {
      setForm((prev) => ({ ...prev, stateCode: value, citySlug: '' }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!onSave || !profile) return;
    setSaving(true);
    setStatus(null);
    try {
      const payload = {
        skills: form.skills,
        interests: form.interests,
        availability: form.availability || null,
        stateCode: form.stateCode || null,
        citySlug: form.citySlug || null,
        bio: form.bio,
      };
      const updated = await onSave(payload);
      setStatus({ type: 'success', message: 'Profile saved successfully.' });
      setForm({
        skills: mapProfileList(updated.skills),
        interests: mapProfileList(updated.interests),
        availability: updated.availability || '',
        stateCode: updated.stateCode || '',
        citySlug: updated.citySlug || '',
        bio: updated.bio || '',
      });
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Unable to update your profile.' });
    } finally {
      setSaving(false);
    }
  };

  const selectedSkills = useMemo(
    () => form.skills.map((value) => ({ value, label: resolveLabel(skillOptions, value) })),
    [form.skills, skillOptions]
  );
  const selectedInterests = useMemo(
    () => form.interests.map((value) => ({ value, label: resolveLabel(interestOptions, value) })),
    [form.interests, interestOptions]
  );

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <div className="grid gap-3">
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-semibold text-brand-forest">Skills</legend>
          <p className="m-0 text-xs text-brand-muted">
            Pick every skill you bring. Add your own if it is missing.
          </p>
          <div className="grid gap-2 rounded-lg border border-brand-forest/20 bg-white p-3 shadow-sm sm:grid-cols-2">
            {skillOptions.length ? (
              skillOptions.map((option) => (
                <label key={option.value} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-brand-forest/40 text-brand-green focus:ring-brand-green"
                    checked={form.skills.includes(option.value)}
                    onChange={() => toggleSelection('skills', option.value)}
                  />
                  <span>{option.label}</span>
                </label>
              ))
            ) : (
              <span className="text-sm text-brand-muted">Loading skill options…</span>
            )}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              className="flex-1 rounded-lg border border-brand-forest/20 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-green focus:outline-none"
              type="text"
              name="customSkill"
              placeholder="Add a custom skill"
              value={customSkill}
              onChange={(event) => setCustomSkill(event.target.value)}
            />
            <button
              type="button"
              className="btn-primary"
              onClick={() => handleAddCustom('skills', customSkill, setCustomSkill)}
            >
              Add skill
            </button>
          </div>
          {selectedSkills.length ? (
            <div className="flex flex-wrap gap-2 text-xs">
              {selectedSkills.map((item) => (
                <span
                  key={item.value}
                  className="rounded-full bg-brand-mint/40 px-3 py-1 text-brand-forest"
                >
                  {item.label}
                </span>
              ))}
            </div>
          ) : null}
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-semibold text-brand-forest">Interests</legend>
          <p className="m-0 text-xs text-brand-muted">
            Highlight the causes you want to champion. Add more if we missed one.
          </p>
          <div className="grid gap-2 rounded-lg border border-brand-forest/20 bg-white p-3 shadow-sm sm:grid-cols-2">
            {interestOptions.length ? (
              interestOptions.map((option) => (
                <label key={option.value} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-brand-forest/40 text-brand-green focus:ring-brand-green"
                    checked={form.interests.includes(option.value)}
                    onChange={() => toggleSelection('interests', option.value)}
                  />
                  <span>{option.label}</span>
                </label>
              ))
            ) : (
              <span className="text-sm text-brand-muted">Loading interest options…</span>
            )}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              className="flex-1 rounded-lg border border-brand-forest/20 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-green focus:outline-none"
              type="text"
              name="customInterest"
              placeholder="Add a custom interest"
              value={customInterest}
              onChange={(event) => setCustomInterest(event.target.value)}
            />
            <button
              type="button"
              className="btn-primary"
              onClick={() => handleAddCustom('interests', customInterest, setCustomInterest)}
            >
              Add interest
            </button>
          </div>
          {selectedInterests.length ? (
            <div className="flex flex-wrap gap-2 text-xs">
              {selectedInterests.map((item) => (
                <span
                  key={item.value}
                  className="rounded-full bg-brand-sand px-3 py-1 text-brand-forest"
                >
                  {item.label}
                </span>
              ))}
            </div>
          ) : null}
        </fieldset>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-brand-forest">Availability</span>
          <select
            className="rounded-lg border border-brand-forest/20 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-green focus:outline-none"
            name="availability"
            value={form.availability}
            onChange={handleSelectChange}
          >
            <option value="">Select when you can contribute</option>
            {(lookups?.availability || []).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold text-brand-forest">State</span>
            <select
              className="rounded-lg border border-brand-forest/20 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-green focus:outline-none"
              name="stateCode"
              value={form.stateCode}
              onChange={handleSelectChange}
            >
              <option value="">Select your state</option>
              {(lookups?.states || []).map((state) => (
                <option key={state.value} value={state.value}>
                  {state.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold text-brand-forest">City</span>
            <select
              className="rounded-lg border border-brand-forest/20 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-green focus:outline-none"
              name="citySlug"
              value={form.citySlug}
              onChange={handleSelectChange}
              disabled={!form.stateCode || !cityOptions.length}
            >
              <option value="">
                {form.stateCode ? 'Select your city' : 'Choose a state first'}
              </option>
              {cityOptions.map((city) => (
                <option key={city.value} value={city.value}>
                  {city.label}
                </option>
              ))}
            </select>
            {form.stateCode && !cityOptions.length ? (
              <span className="text-xs text-brand-muted">Loading cities for your state…</span>
            ) : null}
          </label>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-brand-forest">Bio</span>
          <textarea
            className="min-h-[96px] rounded-lg border border-brand-forest/20 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-green focus:outline-none"
            name="bio"
            placeholder="Share a sentence about why you volunteer."
            value={form.bio}
            onChange={(event) => setForm((prev) => ({ ...prev, bio: event.target.value }))}
          />
        </label>
      </div>
      {status ? (
        <p
          className={`m-0 text-sm ${status.type === 'success' ? 'text-brand-green' : 'text-red-600'}`}
        >
          {status.message}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
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
