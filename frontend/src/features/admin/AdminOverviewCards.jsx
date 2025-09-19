import DashboardCard from '../dashboard/DashboardCard';

function formatMinutes(minutes) {
  if (!minutes) {
    return '0 hrs';
  }
  const hours = Math.round((Number(minutes) || 0) / 60);
  return `${hours} hrs`;
}

export default function AdminOverviewCards({ overview, loading = false, error = '' }) {
  if (loading) {
    return (
      <div className="md:col-span-full">
        <DashboardCard
          title="Community snapshot"
          description="Pulse metrics will appear once the reports load."
        >
          <p className="m-0 text-sm text-brand-muted">Loading overview…</p>
        </DashboardCard>
      </div>
    );
  }

  if (error) {
    return (
      <div className="md:col-span-full">
        <DashboardCard
          title="Community snapshot"
          description="We hit a snag while loading metrics."
        >
          <p className="m-0 text-sm font-medium text-red-600">{error}</p>
        </DashboardCard>
      </div>
    );
  }

  if (!overview) {
    return null;
  }

  const roleEntries = Object.entries(overview.roleCounts || {});

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <DashboardCard
        title="Community snapshot"
        description="Active accounts and role distribution across the platform."
      >
        <ul className="m-0 list-none space-y-1.5 p-0 text-sm text-brand-muted">
          <li>
            Active users: <strong className="text-brand-forest">{overview.users?.active ?? 0}</strong>
          </li>
          <li>
            Inactive users: <strong className="text-brand-forest">{overview.users?.inactive ?? 0}</strong>
          </li>
          <li>
            Total accounts: <strong className="text-brand-forest">{overview.users?.total ?? 0}</strong>
          </li>
          {roleEntries.length ? (
            <li>
              <span className="font-semibold text-brand-forest">Roles</span>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-brand-muted">
                {roleEntries.map(([role, count]) => (
                  <li key={role} className="uppercase tracking-[0.2em] text-brand-forest">
                    {role}: {count}
                  </li>
                ))}
              </ul>
            </li>
          ) : null}
        </ul>
      </DashboardCard>

      <DashboardCard
        title="Event pipeline"
        description="Monitor the flow of events from submission to impact."
      >
        <ul className="m-0 list-none space-y-1.5 p-0 text-sm text-brand-muted">
          <li>
            Pending approval: <strong className="text-brand-forest">{overview.events?.pendingApproval ?? 0}</strong>
          </li>
          <li>
            Published: <strong className="text-brand-forest">{overview.events?.published ?? 0}</strong>
          </li>
          <li>
            Upcoming: <strong className="text-brand-forest">{overview.events?.upcoming ?? 0}</strong>
          </li>
          <li>
            Completed: <strong className="text-brand-forest">{overview.events?.completed ?? 0}</strong>
          </li>
        </ul>
      </DashboardCard>

      <DashboardCard
        title="Sponsor impact"
        description="Track sponsor approvals and approved contribution volume."
      >
        <ul className="m-0 list-none space-y-1.5 p-0 text-sm text-brand-muted">
          <li>
            Approved sponsors: <strong className="text-brand-forest">{overview.sponsors?.approved ?? 0}</strong>
          </li>
          <li>
            Pending reviews: <strong className="text-brand-forest">{overview.sponsors?.pending ?? 0}</strong>
          </li>
          <li>
            Declined applications: <strong className="text-brand-forest">{overview.sponsors?.declined ?? 0}</strong>
          </li>
          <li>
            Approved funds: <strong className="text-brand-forest">₹{Number(overview.sponsors?.approvedFunds || 0).toLocaleString()}</strong>
          </li>
        </ul>
      </DashboardCard>

      <DashboardCard
        title="Engagement pulse"
        description="Volunteer momentum and gallery health across the last month."
      >
        <ul className="m-0 list-none space-y-1.5 p-0 text-sm text-brand-muted">
          <li>
            Volunteer hours logged: <strong className="text-brand-forest">{formatMinutes(overview.volunteers?.totalMinutes)}</strong>
          </li>
          <li>
            Active volunteers (30 days):{' '}
            <strong className="text-brand-forest">{overview.volunteers?.activeLast30Days ?? 0}</strong>
          </li>
          <li>
            Gallery items pending: <strong className="text-brand-forest">{overview.gallery?.pending ?? 0}</strong>
          </li>
          <li>
            Approvals last week: <strong className="text-brand-forest">{overview.audits?.actionsLast7Days ?? 0}</strong>
          </li>
        </ul>
      </DashboardCard>
    </div>
  );
}
