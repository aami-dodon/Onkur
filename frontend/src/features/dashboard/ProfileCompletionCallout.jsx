import { Link } from 'react-router-dom';

export default function ProfileCompletionCallout({
  progress,
  title,
  description,
  ctaLabel = 'Update my profile',
  className = '',
}) {
  if (!progress || progress.isComplete) {
    return null;
  }

  const sectionClassName = [
    'rounded-3xl border border-amber-200 bg-amber-50 p-5',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section className={sectionClassName}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2 sm:max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-amber-600">
            <span>{progress.percentage}% complete</span>
          </div>
          <h3 className="m-0 font-display text-xl font-semibold text-brand-forest">{title}</h3>
          <p className="m-0 text-sm text-brand-muted">{description}</p>
          {progress.missing.length ? (
            <ul className="m-0 list-disc space-y-1 pl-5 text-sm text-amber-700">
              {progress.missing.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center">
          <Link className="btn-primary" to="/app/profile">
            {ctaLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}
