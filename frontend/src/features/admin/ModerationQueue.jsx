import DashboardCard from '../dashboard/DashboardCard';

function formatDate(value) {
  if (!value) {
    return '—';
  }
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '—';
    }
    return date.toLocaleString();
  } catch (error) {
    return '—';
  }
}

function QueueTable({ title, emptyLabel, rows, columns, onApprove, onReject, busyId }) {
  return (
    <DashboardCard title={title} description={rows.length ? undefined : emptyLabel}>
      {rows.length ? (
        <div className="-mx-4 overflow-x-auto">
          <table className="min-w-full table-auto text-sm">
            <thead className="bg-brand-sand/40 text-left text-xs font-semibold uppercase tracking-[0.18em] text-brand-muted">
              <tr>
                {columns.map((column) => (
                  <th key={column.key} className="px-4 py-3">
                    {column.label}
                  </th>
                ))}
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.id} className={index % 2 === 0 ? 'bg-white' : 'bg-brand-green/5'}>
                  {columns.map((column) => (
                    <td key={column.key} className="px-4 py-3 text-brand-forest">
                      {column.render ? column.render(row) : row[column.key] ?? '—'}
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => onReject(row)}
                        disabled={busyId === row.id}
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => onApprove(row)}
                        disabled={busyId === row.id}
                      >
                        Approve
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </DashboardCard>
  );
}

export default function ModerationQueue({ queue, onApprove, onReject, busyId }) {
  const events = Array.isArray(queue?.events) ? queue.events : [];
  const sponsors = Array.isArray(queue?.sponsors) ? queue.sponsors : [];
  const media = Array.isArray(queue?.media) ? queue.media : [];

  return (
    <div className="grid gap-5 md:[grid-template-columns:repeat(auto-fit,minmax(320px,1fr))]">
      <QueueTable
        title="Event submissions"
        emptyLabel="No events waiting for approval."
        rows={events.map((event) => ({
          ...event,
          managerName: event.manager?.name || 'Unassigned',
          managerEmail: event.manager?.email || '—',
        }))}
        columns={[
          { key: 'title', label: 'Event' },
          { key: 'managerName', label: 'Manager' },
          {
            key: 'submittedAt',
            label: 'Submitted',
            render: (row) => formatDate(row.submittedAt || row.createdAt),
          },
          {
            key: 'location',
            label: 'Location',
            render: (row) => row.location || '—',
          },
        ]}
        busyId={busyId}
        onApprove={(row) => onApprove({ type: 'events', id: row.id })}
        onReject={(row) => onReject({ type: 'events', id: row.id })}
      />
      <QueueTable
        title="Sponsor applications"
        emptyLabel="No sponsor applications pending."
        rows={sponsors}
        columns={[
          { key: 'orgName', label: 'Organisation' },
          { key: 'contactName', label: 'Contact' },
          { key: 'contactEmail', label: 'Email' },
          {
            key: 'submittedAt',
            label: 'Submitted',
            render: (row) => formatDate(row.submittedAt),
          },
        ]}
        busyId={busyId}
        onApprove={(row) => onApprove({ type: 'sponsors', id: row.userId })}
        onReject={(row) => onReject({ type: 'sponsors', id: row.userId })}
      />
      <QueueTable
        title="Gallery moderation"
        emptyLabel="No media waiting for review."
        rows={media}
        columns={[
          { key: 'eventTitle', label: 'Event' },
          { key: 'uploaderName', label: 'Uploaded by' },
          {
            key: 'createdAt',
            label: 'Uploaded',
            render: (row) => formatDate(row.createdAt),
          },
        ]}
        busyId={busyId}
        onApprove={(row) => onApprove({ type: 'media', id: row.id })}
        onReject={(row) => onReject({ type: 'media', id: row.id })}
      />
    </div>
  );
}
