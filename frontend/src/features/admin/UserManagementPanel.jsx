import DashboardCard from '../dashboard/DashboardCard';

export default function UserManagementPanel({
  users,
  roles,
  form,
  onFormChange,
  onSubmit,
  state,
  onRefresh,
}) {
  return (
    <DashboardCard
      title="User management"
      description="Adjust roles or deactivate accounts when responsibilities change."
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-brand-muted" htmlFor="admin-user-select">
            Select user
          </label>
          <div className="flex gap-2">
            <select
              id="admin-user-select"
              name="userId"
              value={form.userId}
              onChange={(event) => onFormChange({ userId: event.target.value })}
              className="w-full rounded-md border border-brand-green/40 bg-white/90 px-3 py-3 text-base shadow-sm transition focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/40"
            >
              <option value="">Choose a user</option>
              {users.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name} · {entry.email} {entry.isActive ? '' : '(inactive)'}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={onRefresh}
              className="rounded-md border border-brand-green/40 bg-white px-3 py-2 text-sm font-semibold text-brand-forest shadow-sm transition hover:bg-brand-sand/70"
            >
              Refresh
            </button>
          </div>
        </div>

        <fieldset className="flex flex-col gap-3 rounded-md border border-brand-green/30 bg-brand-sand/20 px-3 py-3">
          <legend className="px-2 text-xs font-semibold uppercase tracking-[0.2em] text-brand-muted">
            Roles
          </legend>
          {roles.map((role) => {
            const inputId = `admin-role-${role.toLowerCase()}`;
            const checked = form.roles.includes(role);
            return (
              <label
                key={role}
                htmlFor={inputId}
                className="flex items-center justify-between gap-3 rounded-md border border-brand-green/40 bg-white/80 px-3 py-2"
              >
                <span className="text-sm font-medium text-brand-forest">
                  {role.replace('_', ' ')}
                </span>
                <input
                  id={inputId}
                  type="checkbox"
                  checked={checked}
                  onChange={() =>
                    onFormChange({
                      roles: checked
                        ? form.roles.filter((entry) => entry !== role)
                        : [...form.roles, role],
                    })
                  }
                  className="h-4 w-4 rounded border-brand-green text-brand-green focus:ring-brand-green"
                />
              </label>
            );
          })}
        </fieldset>

        <label className="flex items-center justify-between gap-3 rounded-md border border-brand-green/40 bg-white/80 px-3 py-2 text-sm font-medium text-brand-forest">
          Active account
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(event) => onFormChange({ isActive: event.target.checked })}
            className="h-4 w-4 rounded border-brand-green text-brand-green focus:ring-brand-green"
          />
        </label>

        {state.error ? <p className="text-sm font-medium text-red-600">{state.error}</p> : null}
        {state.message ? (
          <p className="text-sm font-semibold text-brand-green">{state.message}</p>
        ) : null}

        <button type="submit" className="btn-primary" disabled={state.status === 'loading'}>
          {state.status === 'loading' ? 'Saving…' : 'Update user'}
        </button>
      </form>
    </DashboardCard>
  );
}
