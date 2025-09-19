import SponsorImpactSummary from './SponsorImpactSummary';

const numberFormatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });

function StatusBadge({ status }) {
  const normalized = (status || '').toUpperCase();
  const tone =
    normalized === 'APPROVED'
      ? 'bg-brand-forest/10 text-brand-forest'
      : normalized === 'DECLINED'
      ? 'bg-red-100 text-red-700'
      : 'bg-brand-sand text-brand-muted';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${tone}`}>
      {normalized}
    </span>
  );
}

function ContributionDetails({ sponsorship }) {
  if (!sponsorship) {
    return null;
  }
  const report = sponsorship.reportSnapshot || sponsorship.report_snapshot || null;
  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-brand-forest/10 bg-white/80 p-4">
      <header className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="m-0 text-base font-semibold text-brand-forest">{sponsorship.event?.title || 'Sponsored event'}</h4>
          <StatusBadge status={sponsorship.status} />
        </div>
        <p className="m-0 text-xs uppercase tracking-[0.22em] text-brand-muted">
          {sponsorship.type === 'FUNDS' ? 'Financial support' : 'In-kind support'}
          {typeof sponsorship.amount === 'number'
            ? ` · ₹${numberFormatter.format(sponsorship.amount)}`
            : ''}
        </p>
        <p className="m-0 text-xs text-brand-muted">
          {sponsorship.event?.location || 'Across our communities'}
        </p>
      </header>
      {report ? (
        <dl className="grid gap-3 text-xs text-brand-muted sm:grid-cols-2">
          <div>
            <dt className="font-semibold text-brand-forest">Volunteer hours</dt>
            <dd className="m-0">{numberFormatter.format(report.totals?.totalHours || 0)}</dd>
          </div>
          <div>
            <dt className="font-semibold text-brand-forest">Gallery views</dt>
            <dd className="m-0">{numberFormatter.format(report.gallery?.viewCount || 0)}</dd>
          </div>
          <div>
            <dt className="font-semibold text-brand-forest">Attendance rate</dt>
            <dd className="m-0">
              {report.totals?.attendanceRate
                ? `${numberFormatter.format(report.totals.attendanceRate * 100)}%`
                : '–'}
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-brand-forest">Cost per hour</dt>
            <dd className="m-0">
              {report.roi?.costPerHour ? `₹${numberFormatter.format(report.roi.costPerHour)}` : '–'}
            </dd>
          </div>
        </dl>
      ) : (
        <p className="m-0 rounded-xl border border-dashed border-brand-forest/20 bg-brand-sand/50 p-3 text-xs text-brand-muted">
          Impact report will appear after the event wraps up.
        </p>
      )}
      {sponsorship.notes ? (
        <p className="m-0 text-xs text-brand-muted">{sponsorship.notes}</p>
      ) : null}
    </div>
  );
}

export default function SponsorSponsorshipList({ sponsorships, metrics }) {
  if (!Array.isArray(sponsorships) || !sponsorships.length) {
    return (
      <div className="rounded-3xl border border-dashed border-brand-forest/20 bg-white/80 p-5 text-sm text-brand-muted">
        Once your sponsorships are confirmed they will appear here with live metrics.
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-6">
      <SponsorImpactSummary metrics={metrics} />
      <div className="grid gap-4">
        {sponsorships.map((sponsorship) => (
          <ContributionDetails key={sponsorship.id} sponsorship={sponsorship} />
        ))}
      </div>
    </div>
  );
}
