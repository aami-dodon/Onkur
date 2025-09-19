import DashboardCard from '../dashboard/DashboardCard';

function formatNumber(value, { maximumFractionDigits = 1 } = {}) {
  return Number(value || 0).toLocaleString('en-US', { maximumFractionDigits });
}

export default function ImpactAnalyticsPanel({
  metrics,
  state,
  onRefresh,
  onExport,
  exporting,
  exportError,
}) {
  const loading = state?.status === 'loading';
  const error = state?.error || '';
  const actions = [
    {
      label: loading ? 'Refreshing…' : 'Refresh',
      onClick: onRefresh,
      disabled: loading,
    },
    {
      label: exporting ? 'Preparing CSV…' : 'Export report',
      onClick: onExport,
      disabled: exporting,
    },
  ];

  return (
    <DashboardCard
      title="Impact analytics"
      description="Platform-wide stories, engagement, and sponsor reach at a glance."
      className="md:col-span-full"
      actions={actions}
    >
      {loading && !metrics ? (
        <p className="m-0 text-sm text-brand-muted">Loading analytics…</p>
      ) : null}
      {error ? <p className="m-0 text-sm font-medium text-red-600">{error}</p> : null}
      {metrics ? (
        <div className="grid gap-4 md:grid-cols-2">
          <section className="flex flex-col gap-2">
            <h4 className="m-0 text-sm font-semibold uppercase tracking-[0.2em] text-brand-muted">
              Stories & volunteers
            </h4>
            <ul className="m-0 list-none space-y-1.5 p-0 text-sm text-brand-muted">
              <li>
                <span className="font-semibold text-brand-forest">
                  {formatNumber(metrics.stories?.approved ?? 0, { maximumFractionDigits: 0 })}
                </span>{' '}
                stories approved (
                {formatNumber(metrics.stories?.pending ?? 0, { maximumFractionDigits: 0 })}{' '}
                pending).
              </li>
              <li>
                <span className="font-semibold text-brand-forest">
                  {formatNumber(metrics.volunteerEngagement?.totalHours ?? 0)}
                </span>{' '}
                volunteer hours logged,{' '}
                {formatNumber(metrics.volunteerEngagement?.activeLast90Days ?? 0, {
                  maximumFractionDigits: 0,
                })}{' '}
                active in 90 days.
              </li>
              <li>
                Retention trend:{' '}
                <span className="font-semibold text-brand-forest">
                  {((metrics.volunteerEngagement?.retentionDelta ?? 0) * 100).toFixed(1)}%
                </span>
              </li>
            </ul>
          </section>
          <section className="flex flex-col gap-2">
            <h4 className="m-0 text-sm font-semibold uppercase tracking-[0.2em] text-brand-muted">
              Galleries & sponsors
            </h4>
            <ul className="m-0 list-none space-y-1.5 p-0 text-sm text-brand-muted">
              <li>
                Galleries collected{' '}
                <span className="font-semibold text-brand-forest">
                  {formatNumber(metrics.galleryEngagement?.totalViews ?? 0, {
                    maximumFractionDigits: 0,
                  })}
                </span>{' '}
                views across{' '}
                {formatNumber(metrics.galleryEngagement?.trackedEvents ?? 0, {
                  maximumFractionDigits: 0,
                })}{' '}
                events.
              </li>
              <li>
                Sponsors featured{' '}
                <span className="font-semibold text-brand-forest">
                  {formatNumber(metrics.sponsorImpact?.sponsorMentions ?? 0, {
                    maximumFractionDigits: 0,
                  })}
                </span>{' '}
                times with{' '}
                {formatNumber(metrics.sponsorImpact?.approvedSponsorships ?? 0, {
                  maximumFractionDigits: 0,
                })}{' '}
                active pledges.
              </li>
              <li>
                Analytics dashboard opened{' '}
                <span className="font-semibold text-brand-forest">
                  {formatNumber(metrics.analyticsUsage?.viewsLast30Days ?? 0, {
                    maximumFractionDigits: 0,
                  })}
                </span>{' '}
                times in the last 30 days.
              </li>
            </ul>
          </section>
        </div>
      ) : null}
      {exportError ? <p className="mt-3 text-sm font-medium text-red-600">{exportError}</p> : null}
    </DashboardCard>
  );
}
