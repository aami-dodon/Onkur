import { useState } from 'react';
import DashboardCard from '../dashboard/DashboardCard';

const ENTITY_OPTIONS = [
  { value: 'users', label: 'Users' },
  { value: 'events', label: 'Events' },
  { value: 'sponsorships', label: 'Sponsorships' },
  { value: 'media', label: 'Gallery media' },
];

const FORMAT_OPTIONS = [
  { value: 'csv', label: 'CSV' },
  { value: 'xlsx', label: 'Excel (.xlsx)' },
];

export default function ExportTools({ onExport }) {
  const [entity, setEntity] = useState('users');
  const [format, setFormat] = useState('csv');
  const [status, setStatus] = useState({ type: 'idle', message: '' });

  const handleExport = async () => {
    if (!onExport) {
      return;
    }
    try {
      setStatus({ type: 'loading', message: 'Preparing export…' });
      const result = await onExport({ entity, format });
      if (!result || !result.blob) {
        throw new Error('Export failed');
      }
      const downloadUrl = URL.createObjectURL(result.blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = result.filename || `${entity}-export.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(downloadUrl);
      setStatus({ type: 'success', message: 'Export ready! Download should begin automatically.' });
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Unable to export data' });
    }
  };

  return (
    <DashboardCard
      title="Export data"
      description="Download snapshots for deeper analysis or compliance reporting."
      actions={[{ label: status.type === 'loading' ? 'Exporting…' : 'Export', onClick: handleExport, disabled: status.type === 'loading' }]}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-brand-forest">
          <span className="font-semibold text-brand-muted">Entity</span>
          <select
            value={entity}
            onChange={(event) => setEntity(event.target.value)}
            className="rounded-lg border border-brand-green/40 bg-white px-3 py-2 shadow-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/40"
          >
            {ENTITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm text-brand-forest">
          <span className="font-semibold text-brand-muted">Format</span>
          <select
            value={format}
            onChange={(event) => setFormat(event.target.value)}
            className="rounded-lg border border-brand-green/40 bg-white px-3 py-2 shadow-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/40"
          >
            {FORMAT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {status.type === 'error' ? (
        <p className="text-sm font-semibold text-red-600">{status.message}</p>
      ) : null}
      {status.type === 'success' ? (
        <p className="text-sm font-semibold text-brand-green">{status.message}</p>
      ) : null}
    </DashboardCard>
  );
}
