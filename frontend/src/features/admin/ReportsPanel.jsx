import DashboardCard from '../dashboard/DashboardCard';

function Stat({ label, value, sublabel }) {
  return (
    <div className="flex flex-col rounded-xl bg-brand-sand/40 p-4 text-sm text-brand-forest">
      <span className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-muted">{label}</span>
      <span className="text-2xl font-semibold text-brand-green">{value}</span>
      {sublabel ? <span className="text-xs text-brand-muted">{sublabel}</span> : null}
    </div>
  );
}

function formatHours(value) {
  if (value === null || value === undefined) {
    return '—';
  }
  const hours = Number(value);
  if (!Number.isFinite(hours)) {
    return '—';
  }
  if (hours < 1) {
    return `${(hours * 60).toFixed(0)} min`;
  }
  return `${hours.toFixed(1)} h`;
}

export default function ReportsPanel({ report, onRefresh, loading }) {
  const users = report?.users || {};
  const volunteers = report?.volunteers || {};
  const events = report?.events || {};
  const sponsors = report?.sponsors || {};
  const media = report?.media || {};
  const moderation = report?.moderation || {};

  return (
    <DashboardCard
      title="Operational overview"
      description="Snapshot of ecosystem health. Export full data for deeper analysis."
      actions={onRefresh ? [{ label: loading ? 'Refreshing…' : 'Refresh', onClick: onRefresh, disabled: loading }] : []}
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Stat label="Total users" value={users.total ?? '0'} sublabel={`${users.active ?? 0} active · ${users.inactive ?? 0} inactive`} />
        <Stat
          label="Volunteers"
          value={volunteers.total ?? '0'}
          sublabel={`${volunteers.engaged ?? 0} engaged in events`}
        />
        <Stat
          label="Published events"
          value={events.published ?? '0'}
          sublabel={`${events.pendingApproval ?? 0} awaiting approval`}
        />
        <Stat
          label="Approval turnaround"
          value={formatHours(events.approvalTurnaroundHours)}
          sublabel="Average admin response time"
        />
        <Stat
          label="Active sponsors"
          value={sponsors.approved ?? '0'}
          sublabel={`${sponsors.pendingApplications ?? 0} applications pending`}
        />
        <Stat
          label="Approved sponsorships"
          value={sponsors.approvedSponsorships ?? '0'}
          sublabel={`₹${Number(sponsors.approvedAmount || 0).toLocaleString()} pledged`}
        />
        <Stat
          label="Gallery moderation"
          value={`${media.approved ?? 0}/${media.pending ?? 0}`}
          sublabel={`Rejected rate ${(media.rejectedRate ? (media.rejectedRate * 100).toFixed(1) : '0.0')}%`}
        />
        <Stat
          label="Events approved (30d)"
          value={moderation.eventsApproved30 ?? '0'}
          sublabel={`${moderation.eventsRejected30 ?? 0} rejected`}
        />
        <Stat
          label="Media moderated (30d)"
          value={moderation.mediaModerated30 ?? '0'}
          sublabel="Across all galleries"
        />
      </div>
    </DashboardCard>
  );
}
