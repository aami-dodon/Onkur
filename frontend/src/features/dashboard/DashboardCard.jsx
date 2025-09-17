export default function DashboardCard({ title, description, children, actions = [], className = '' }) {
  const baseClasses =
    'flex h-full flex-col gap-3 rounded-[20px] bg-white p-6 shadow-[0_12px_28px_rgba(47,133,90,0.15)]';
  const combinedClasses = className ? `${baseClasses} ${className}` : baseClasses;

  return (
    <section className={combinedClasses}>
      <div className="space-y-1">
        <h3 className="m-0 text-lg font-semibold text-brand-green">{title}</h3>
        {description ? <p className="m-0 text-sm text-brand-muted">{description}</p> : null}
      </div>
      {children}
      {actions.length ? (
        <div className="mt-auto flex flex-wrap gap-2">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              className="btn-primary"
              onClick={action.onClick}
              disabled={action.disabled}
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
