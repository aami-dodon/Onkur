import DashboardCard from '../dashboard/DashboardCard';

const EXPORT_OPTIONS = [
  { key: 'users', label: 'Users dataset' },
  { key: 'events', label: 'Events dataset' },
  { key: 'sponsorships', label: 'Sponsorships dataset' },
  { key: 'media', label: 'Gallery dataset' },
];

export default function ReportingPanel({ onExport, exportState, format, onFormatChange }) {
  return (
    <DashboardCard
      title="Reporting & exports"
      description="Snapshot metrics and export raw data for deeper analysis."
      className="md:col-span-full"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="m-0 text-sm text-brand-muted">
          Choose your file type, then download the dataset you need.
        </p>
        <label className="flex items-center gap-2 text-sm font-medium text-brand-forest">
          Format
          <select
            value={format}
            onChange={(event) => onFormatChange(event.target.value)}
            className="rounded-lg border border-brand-green/40 bg-white px-3 py-1 text-sm shadow-sm focus:border-brand-forest focus:outline-none focus:ring-2 focus:ring-brand-forest/40"
          >
            <option value="csv">CSV</option>
            <option value="excel">Excel</option>
          </select>
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {EXPORT_OPTIONS.map((option) => {
          const busy = exportState.entity === option.key && exportState.status === 'loading';
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => onExport(option.key, format)}
              disabled={busy}
              className="rounded-xl border border-brand-green/30 bg-white px-4 py-3 text-sm font-semibold text-brand-forest shadow-sm transition hover:bg-brand-sand/60 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy
                ? 'Preparing…'
                : `Download ${option.label} (${format === 'excel' ? 'Excel' : 'CSV'})`}
            </button>
          );
        })}
      </div>

      {exportState.error ? (
        <p className="mt-3 text-sm font-medium text-red-600">{exportState.error}</p>
      ) : null}

      <p className="mt-4 text-xs text-brand-muted">
        Exports include UTC timestamps. CSV opens in any spreadsheet, and the Excel option ships a
        ready-to-open workbook for stakeholders who prefer .xls files.
      </p>
    </DashboardCard>
  );
}
