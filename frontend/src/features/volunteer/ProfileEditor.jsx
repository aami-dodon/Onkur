import { useEffect, useMemo, useState } from 'react';

function listToInput(value) {
  return Array.isArray(value) && value.length ? value.join(', ') : '';
}

export default function ProfileEditor({ profile, onSave }) {
  const [form, setForm] = useState({
    skills: '',
    interests: '',
    availability: '',
    location: '',
    bio: '',
  });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);

  const hasChanges = useMemo(() => {
    if (!profile) return false;
    return (
      form.skills !== listToInput(profile.skills) ||
      form.interests !== listToInput(profile.interests) ||
      form.availability !== (profile.availability || '') ||
      form.location !== (profile.location || '') ||
      form.bio !== (profile.bio || '')
    );
  }, [form, profile]);

  useEffect(() => {
    if (!profile) return;
    setForm({
      skills: listToInput(profile.skills),
      interests: listToInput(profile.interests),
      availability: profile.availability || '',
      location: profile.location || '',
      bio: profile.bio || '',
    });
  }, [profile]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!onSave || !profile) return;
    setSaving(true);
    setStatus(null);
    try {
      const payload = {
        skills: form.skills
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        interests: form.interests
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        availability: form.availability,
        location: form.location,
        bio: form.bio,
      };
      const updated = await onSave(payload);
      setStatus({ type: 'success', message: 'Profile saved successfully.' });
      setForm({
        skills: listToInput(updated.skills),
        interests: listToInput(updated.interests),
        availability: updated.availability || '',
        location: updated.location || '',
        bio: updated.bio || '',
      });
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Unable to update your profile.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <div className="grid gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-brand-forest">Skills</span>
          <input
            className="rounded-lg border border-brand-forest/20 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-green focus:outline-none"
            type="text"
            name="skills"
            placeholder="e.g. planting, first aid, coordination"
            value={form.skills}
            onChange={handleChange}
          />
          <span className="text-xs text-brand-muted">Separate skills with commas to help us match you to the right roles.</span>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-brand-forest">Interests</span>
          <input
            className="rounded-lg border border-brand-forest/20 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-green focus:outline-none"
            type="text"
            name="interests"
            placeholder="e.g. wetlands, youth mentorship"
            value={form.interests}
            onChange={handleChange}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-brand-forest">Availability</span>
          <input
            className="rounded-lg border border-brand-forest/20 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-green focus:outline-none"
            type="text"
            name="availability"
            placeholder="Weekends, weekday evenings, etc."
            value={form.availability}
            onChange={handleChange}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-brand-forest">Location</span>
          <input
            className="rounded-lg border border-brand-forest/20 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-green focus:outline-none"
            type="text"
            name="location"
            placeholder="City or neighbourhood"
            value={form.location}
            onChange={handleChange}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-brand-forest">Bio</span>
          <textarea
            className="min-h-[96px] rounded-lg border border-brand-forest/20 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-green focus:outline-none"
            name="bio"
            placeholder="Share a sentence about why you volunteer."
            value={form.bio}
            onChange={handleChange}
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
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          className="btn-primary"
          disabled={saving || !hasChanges}
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
