export default function DashboardCard({ title, description, children, actions }) {
  return (
    <section className="dashboard-card">
      <div>
        <h3>{title}</h3>
        {description ? <p>{description}</p> : null}
      </div>
      {children}
      {actions && actions.length ? (
        <div className="dashboard-card__actions">
          {actions.map((action) => (
            <button key={action.label} type="button" className="btn-primary" onClick={action.onClick} disabled={action.disabled}>
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
