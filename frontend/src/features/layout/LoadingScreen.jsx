export default function LoadingScreen({ label = 'Loading Onkur…' }) {
  return (
    <div className="loading-screen" role="status" aria-live="polite">
      <div className="loading-spinner" />
      <p>{label}</p>
    </div>
  );
}
