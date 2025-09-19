export default function LoadingScreen({ label = 'Loading Onkur…' }) {
  return (
    <div
      className="flex w-full min-h-[220px] flex-col items-center justify-center gap-4 px-4 py-16 text-brand-green"
      role="status"
      aria-live="polite"
    >
      <div className="h-9 w-9 animate-spin rounded-full border-4 border-brand-green/20 border-t-brand-green" />
      <p className="m-0 text-sm font-medium">{label}</p>
    </div>
  );
}
