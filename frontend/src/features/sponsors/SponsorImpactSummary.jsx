const numberFormatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });

function MetricCard({ label, value, icon }) {
  return (
    <div className="flex flex-col gap-2 rounded-3xl border border-brand-forest/15 bg-brand-sand/60 p-4 shadow-sm">
      <span className="text-2xl" aria-hidden="true">
        {icon}
      </span>
      <span className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-muted">{label}</span>
      <span className="text-lg font-semibold text-brand-forest">{value}</span>
    </div>
  );
}

export default function SponsorImpactSummary({ metrics }) {
  if (!metrics) {
    return null;
  }
  const cards = [
    {
      label: 'Active sponsorships',
      value: numberFormatter.format(metrics.totalApprovedSponsorships || 0),
      icon: '🤝',
    },
    {
      label: 'Volunteer hours',
      value: numberFormatter.format(metrics.totalVolunteerHours || 0),
      icon: '⏱️',
    },
    {
      label: 'Gallery views',
      value: numberFormatter.format(metrics.totalGalleryViews || 0),
      icon: '📸',
    },
    {
      label: 'Funds pledged (₹)',
      value: numberFormatter.format(metrics.totalFunds || 0),
      icon: '💰',
    },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <MetricCard key={card.label} {...card} />
      ))}
    </div>
  );
}
