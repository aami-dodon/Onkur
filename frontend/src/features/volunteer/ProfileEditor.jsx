import { useEffect, useMemo, useState } from 'react';
import useReferenceData from '../../lib/useReferenceData';
import { formatOptionLabel, toSlug } from '../../lib/referenceData';

function normalizeList(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  const seen = new Set();
  return value
    .map((item) => toSlug(item))
    .filter((item) => {
      if (!item) return false;
      if (seen.has(item)) return false;
      seen.add(item);
      return true;
    });
}

function compareSets(a = [], b = []) {
  const left = [...a].sort();
  const right = [...b].sort();
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}

export default function ProfileEditor({ profile, onSave }) {
  const { data: referenceData, status: referenceStatus, error: referenceError } = useReferenceData();
  const [form, setForm] = useState({
    skills: [],
    interests: [],
    availability: '',
    location: '',
    bio: '',
    newSkill: '',
    newInterest: '',
  });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);

  const baseline = useMemo(() => {
    if (!profile) {
      return {
        skills: [],
        interests: [],
        availability: '',
        location: '',
        bio: '',
      };
    }
    return {
      skills: normalizeList(profile.skills),
      interests: normalizeList(profile.interests),
      availability: profile.availability ? toSlug(profile.availability) : '',
      location: profile.locationLabel || profile.location || '',
      bio: profile.bio || '',
    };
  }, [profile]);

  const hasChanges = useMemo(() => {
    if (!profile) return false;
    return (
      !compareSets(form.skills, baseline.skills) ||
      !compareSets(form.interests, baseline.interests) ||
      form.availability !== baseline.availability ||
      form.location !== baseline.location ||
      form.bio !== baseline.bio
    );
  }, [form, baseline, profile]);

  useEffect(() => {
    if (!profile) return;
    setForm((prev) => ({
      ...prev,
      skills: normalizeList(profile.skills),
      interests: normalizeList(profile.interests),
      availability: profile.availability ? toSlug(profile.availability) : '',
      location: profile.locationLabel || profile.location || '',
      bio: profile.bio || '',
      newSkill: '',
      newInterest: '',
    }));
  }, [profile]);

  const referenceReady = referenceStatus === 'success';

  const skillOptions = referenceData?.skills || [];
  const interestOptions = referenceData?.interests || [];
  const availabilityOptions = referenceData?.availability || [];
  const locationOptions = referenceData?.locations || [];
  const locationSuggestions = useMemo(() => locationOptions.map((option) => option.label), [locationOptions]);

  const availabilityChoices = useMemo(() => {
    if (!form.availability || availabilityOptions.some((option) => option.value === form.availability)) {
      return availabilityOptions;
    }
    return [
      ...availabilityOptions,
      {
        value: form.availability,
        label: `${formatOptionLabel(availabilityOptions, form.availability)} (legacy)`,
      },
    ];
  }, [availabilityOptions, form.availability]);

  const availabilityNeedsUpdate = Boolean(
    form.availability && !availabilityOptions.some((option) => option.value === form.availability)
  );

  const customSkills = form.skills.filter((value) => !skillOptions.some((option) => option.value === value));
  const customInterests = form.interests.filter((value) => !interestOptions.some((option) => option.value === value));

  const toggleSelection = (field, value) => {
    setForm((prev) => {
      const current = prev[field];
      if (!Array.isArray(current)) {
        return prev;
      }
      const exists = current.includes(value);
      return {
        ...prev,
        [field]: exists ? current.filter((item) => item !== value) : [...current, value],
      };
    });
  };

  const handleAddCustom = (field, inputField) => {
    setForm((prev) => {
      const raw = prev[inputField];
      const nextValue = toSlug(raw);
      if (!nextValue) {
        return prev;
      }
      const existing = Array.isArray(prev[field]) ? prev[field] : [];
      if (existing.includes(nextValue)) {
        return { ...prev, [inputField]: '' };
      }
      return {
        ...prev,
        [field]: [...existing, nextValue],
        [inputField]: '',
      };
    });
  };

  const handleRemoveCustom = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: prev[field].filter((item) => item !== value),
    }));
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
        availability: form.availability,
        location: form.location,
        bio: form.bio,
      };
      const updated = await onSave(payload);
      setStatus({ type: 'success', message: 'Profile saved successfully.' });
      setForm((prev) => ({
        ...prev,
        skills: normalizeList(updated.skills),
        interests: normalizeList(updated.interests),
        availability: updated.availability ? toSlug(updated.availability) : '',
        location: updated.locationLabel || updated.location || '',
        bio: updated.bio || '',
        newSkill: '',
        newInterest: '',
      }));
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Unable to update your profile.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <div className="grid gap-4">
        <section className="flex flex-col gap-2 text-sm">
          <header className="flex flex-col gap-1">
            <span className="font-semibold text-brand-forest">Skills</span>
            <p className="m-0 text-xs text-brand-muted">
              Select all that apply or add your own specialities.
            </p>
          </header>
          <div className="flex flex-wrap gap-2">
            {skillOptions.map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-2 rounded-full border border-brand-forest/20 bg-white px-3 py-1 shadow-sm"
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-brand-forest/40 text-brand-forest"
                  checked={form.skills.includes(option.value)}
                  onChange={() => toggleSelection('skills', option.value)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
          {customSkills.length ? (
            <div className="flex flex-wrap gap-2">
              {customSkills.map((value) => (
                <span
                  key={value}
                  className="inline-flex items-center gap-2 rounded-full bg-brand-sand/70 px-3 py-1 text-xs text-brand-forest"
                >
                  {formatOptionLabel(skillOptions, value)}
                  <button
                    type="button"
                    className="rounded-full border border-transparent bg-transparent p-1 text-[10px] text-brand-muted hover:text-brand-forest"
                    onClick={() => handleRemoveCustom('skills', value)}
                    aria-label={`Remove ${formatOptionLabel(skillOptions, value)} skill`}
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <input
              className="min-w-[200px] flex-1 rounded-lg border border-brand-forest/20 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-green focus:outline-none"
              type="text"
              name="newSkill"
              placeholder="Add another skill"
              value={form.newSkill}
              onChange={(event) => setForm((prev) => ({ ...prev, newSkill: event.target.value }))}
            />
            <button
              type="button"
              className="rounded-lg border border-brand-forest/20 bg-white px-3 py-2 text-xs font-semibold text-brand-forest shadow-sm hover:border-brand-forest/40"
              onClick={() => handleAddCustom('skills', 'newSkill')}
            >
              Add
            </button>
          </div>
        </section>

        <section className="flex flex-col gap-2 text-sm">
          <header className="flex flex-col gap-1">
            <span className="font-semibold text-brand-forest">Interests</span>
            <p className="m-0 text-xs text-brand-muted">Tell us what energizes you.</p>
          </header>
          <div className="flex flex-wrap gap-2">
            {interestOptions.map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-2 rounded-full border border-brand-forest/20 bg-white px-3 py-1 shadow-sm"
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-brand-forest/40 text-brand-forest"
                  checked={form.interests.includes(option.value)}
                  onChange={() => toggleSelection('interests', option.value)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
          {customInterests.length ? (
            <div className="flex flex-wrap gap-2">
              {customInterests.map((value) => (
                <span
                  key={value}
                  className="inline-flex items-center gap-2 rounded-full bg-brand-sand/70 px-3 py-1 text-xs text-brand-forest"
                >
                  {formatOptionLabel(interestOptions, value)}
                  <button
                    type="button"
                    className="rounded-full border border-transparent bg-transparent p-1 text-[10px] text-brand-muted hover:text-brand-forest"
                    onClick={() => handleRemoveCustom('interests', value)}
                    aria-label={`Remove ${formatOptionLabel(interestOptions, value)} interest`}
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <input
              className="min-w-[200px] flex-1 rounded-lg border border-brand-forest/20 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-green focus:outline-none"
              type="text"
              name="newInterest"
              placeholder="Add another interest"
              value={form.newInterest}
              onChange={(event) => setForm((prev) => ({ ...prev, newInterest: event.target.value }))}
            />
            <button
              type="button"
              className="rounded-lg border border-brand-forest/20 bg-white px-3 py-2 text-xs font-semibold text-brand-forest shadow-sm hover:border-brand-forest/40"
              onClick={() => handleAddCustom('interests', 'newInterest')}
            >
              Add
            </button>
          </div>
        </section>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-brand-forest">Availability</span>
          <select
            name="availability"
            className="rounded-lg border border-brand-forest/20 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-green focus:outline-none"
            value={form.availability}
            disabled={!referenceReady}
            onChange={(event) => setForm((prev) => ({ ...prev, availability: event.target.value }))}
          >
            <option value="">Select your typical schedule</option>
            {availabilityChoices.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {availabilityNeedsUpdate ? (
            <span className="text-xs text-brand-muted">Choose one of the new availability presets to keep things in sync.</span>
          ) : null}
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-brand-forest">Location</span>
          <input
            name="location"
            type="text"
            className="rounded-lg border border-brand-forest/20 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-green focus:outline-none"
            placeholder="City, region, or virtual"
            value={form.location}
            onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))}
            list={locationSuggestions.length ? 'profile-location-suggestions' : undefined}
          />
          {locationSuggestions.length ? (
            <datalist id="profile-location-suggestions">
              {locationSuggestions.map((label) => (
                <option key={label} value={label} />
              ))}
            </datalist>
          ) : null}
        </label>

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

      {referenceError ? (
        <p className="m-0 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          We couldn’t load the shared skills and availability catalogue. Try refreshing the page before saving updates.
        </p>
      ) : null}

      {status ? (
        <p
          className={`m-0 text-sm ${status.type === 'success' ? 'text-brand-green' : 'text-red-600'}`}
        >
          {status.message}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          className="btn-primary"
          disabled={
            saving ||
            !hasChanges ||
            !referenceReady ||
            availabilityNeedsUpdate
          }
        >
          {saving ? 'Saving…' : 'Save profile'}
        </button>
        {!hasChanges ? (
          <span className="text-xs text-brand-muted">Make an update to enable saving.</span>
        ) : null}
      </div>
    </form>
  );
}
