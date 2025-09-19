import { useEffect, useState } from 'react';

const DEFAULT_VALUES = {
  orgName: '',
  website: '',
  logoUrl: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  brandGuidelines: '',
};

export default function SponsorOnboardingForm({
  initialValues,
  onSubmit,
  isSubmitting,
  ctaLabel = 'Submit application',
}) {
  const [form, setForm] = useState(DEFAULT_VALUES);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!initialValues) {
      setForm(DEFAULT_VALUES);
      return;
    }
    setForm({
      orgName: initialValues.orgName || '',
      website: initialValues.website || '',
      logoUrl: initialValues.logoUrl || '',
      contactName: initialValues.contactName || '',
      contactEmail: initialValues.contactEmail || '',
      contactPhone: initialValues.contactPhone || '',
      brandGuidelines:
        initialValues.brandAssets && initialValues.brandAssets.guidelines
          ? initialValues.brandAssets.guidelines
          : '',
    });
  }, [initialValues]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    if (!form.orgName.trim()) {
      setError('Organization name is required.');
      return;
    }
    try {
      await onSubmit?.({
        orgName: form.orgName.trim(),
        website: form.website.trim() || undefined,
        logoUrl: form.logoUrl.trim() || undefined,
        contactName: form.contactName.trim() || undefined,
        contactEmail: form.contactEmail.trim() || undefined,
        contactPhone: form.contactPhone.trim() || undefined,
        brandAssets: {
          guidelines: form.brandGuidelines.trim(),
        },
      });
      setSuccess('Details saved. We will keep you updated.');
    } catch (submissionError) {
      setError(submissionError.message || 'Unable to save sponsor details.');
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-3xl border border-brand-forest/15 bg-white p-5 shadow-[0_20px_40px_rgba(47,133,90,0.08)]"
    >
      <div className="grid gap-4 sm:[grid-template-columns:repeat(2,minmax(0,1fr))]">
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-semibold text-brand-forest">Organization name</span>
          <input
            type="text"
            name="orgName"
            required
            value={form.orgName}
            onChange={handleChange}
            className="rounded-lg border border-brand-forest/20 bg-brand-sand/40 px-3 py-2 text-sm shadow-sm focus:border-brand-green focus:outline-none"
            placeholder="Your brand"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-semibold text-brand-forest">Website</span>
          <input
            type="url"
            name="website"
            value={form.website}
            onChange={handleChange}
            className="rounded-lg border border-brand-forest/20 bg-brand-sand/40 px-3 py-2 text-sm shadow-sm focus:border-brand-green focus:outline-none"
            placeholder="https://example.org"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-semibold text-brand-forest">Primary contact name</span>
          <input
            type="text"
            name="contactName"
            value={form.contactName}
            onChange={handleChange}
            className="rounded-lg border border-brand-forest/20 bg-brand-sand/40 px-3 py-2 text-sm shadow-sm focus:border-brand-green focus:outline-none"
            placeholder="Who should we thank?"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-semibold text-brand-forest">Contact email</span>
          <input
            type="email"
            name="contactEmail"
            value={form.contactEmail}
            onChange={handleChange}
            className="rounded-lg border border-brand-forest/20 bg-brand-sand/40 px-3 py-2 text-sm shadow-sm focus:border-brand-green focus:outline-none"
            placeholder="team@example.org"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-semibold text-brand-forest">Contact phone</span>
          <input
            type="tel"
            name="contactPhone"
            value={form.contactPhone}
            onChange={handleChange}
            className="rounded-lg border border-brand-forest/20 bg-brand-sand/40 px-3 py-2 text-sm shadow-sm focus:border-brand-green focus:outline-none"
            placeholder="+91"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-semibold text-brand-forest">Logo URL</span>
          <input
            type="url"
            name="logoUrl"
            value={form.logoUrl}
            onChange={handleChange}
            className="rounded-lg border border-brand-forest/20 bg-brand-sand/40 px-3 py-2 text-sm shadow-sm focus:border-brand-green focus:outline-none"
            placeholder="https://.../logo.png"
          />
        </label>
      </div>
      <label className="flex flex-col gap-2 text-sm">
        <span className="font-semibold text-brand-forest">Brand guidelines</span>
        <textarea
          name="brandGuidelines"
          rows={4}
          value={form.brandGuidelines}
          onChange={handleChange}
          className="rounded-lg border border-brand-forest/20 bg-brand-sand/40 px-3 py-2 text-sm shadow-sm focus:border-brand-green focus:outline-none"
          placeholder="Recognition preferences, tone, hero statements"
        />
      </label>
      {error ? (
        <p className="m-0 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="m-0 rounded-xl border border-brand-green/20 bg-brand-sand/70 p-3 text-sm text-brand-forest">
          {success}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : ctaLabel}
        </button>
        <span className="text-xs text-brand-muted">
          We review every sponsor to keep the community trusted.
        </span>
      </div>
    </form>
  );
}
