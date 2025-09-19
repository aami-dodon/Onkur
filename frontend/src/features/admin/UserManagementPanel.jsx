import { useEffect, useMemo, useState } from 'react';
import DashboardCard from '../dashboard/DashboardCard';

function formatRole(role) {
  return role
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default function UserManagementPanel({ users, availableRoles, onSubmit, status }) {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!selectedUserId) {
      return;
    }
    const user = users.find((entry) => entry.id === selectedUserId);
    if (!user) {
      return;
    }
    setSelectedRoles(Array.isArray(user.roles) && user.roles.length ? user.roles : user.role ? [user.role] : []);
    setIsActive(user.isActive !== false);
  }, [selectedUserId, users]);

  const roleOptions = useMemo(() => availableRoles || [], [availableRoles]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedUserId) {
      return;
    }
    if (!selectedRoles.length) {
      return;
    }
    await onSubmit({ userId: selectedUserId, roles: selectedRoles, isActive });
  };

  const toggleRole = (role) => {
    setSelectedRoles((prev) => {
      if (prev.includes(role)) {
        return prev.filter((entry) => entry !== role);
      }
      return [...prev, role];
    });
  };

  return (
    <DashboardCard
      title="User management"
      description="Assign roles and control account access."
      className="md:col-span-full"
      actions={[]}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm text-brand-forest">
            <span className="font-semibold text-brand-muted">Select user</span>
            <select
              value={selectedUserId}
              onChange={(event) => setSelectedUserId(event.target.value)}
              className="rounded-lg border border-brand-green/40 bg-white px-3 py-3 shadow-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/40"
            >
              <option value="">Choose a user</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} · {user.email}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center justify-between gap-3 rounded-lg border border-brand-green/40 bg-white px-3 py-3 text-sm text-brand-forest">
            <span className="font-semibold text-brand-muted">Active account</span>
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-brand-green text-brand-green focus:ring-brand-green"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
              disabled={!selectedUserId}
            />
          </label>
        </div>
        <fieldset className="flex flex-col gap-3 rounded-lg border border-brand-green/30 bg-brand-sand/20 px-3 py-3 text-sm text-brand-forest">
          <legend className="px-2 text-xs font-semibold uppercase tracking-[0.25em] text-brand-muted">Roles</legend>
          {roleOptions.map((role) => {
            const inputId = `admin-role-${role.toLowerCase()}`;
            const checked = selectedRoles.includes(role);
            return (
              <label key={role} htmlFor={inputId} className="flex items-center justify-between gap-3 rounded-md border border-brand-green/40 bg-white/90 px-3 py-2">
                <span className="text-sm font-medium text-brand-forest">{formatRole(role)}</span>
                <input
                  id={inputId}
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleRole(role)}
                  className="h-4 w-4 rounded border-brand-green text-brand-green focus:ring-brand-green"
                  disabled={!selectedUserId}
                />
              </label>
            );
          })}
        </fieldset>
        {status?.error ? <p className="text-sm font-semibold text-red-600">{status.error}</p> : null}
        {status?.message ? <p className="text-sm font-semibold text-brand-green">{status.message}</p> : null}
        <div className="flex justify-end">
          <button type="submit" className="btn-primary" disabled={!selectedUserId || !selectedRoles.length || status?.loading}>
            {status?.loading ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full table-auto text-sm">
          <thead className="bg-brand-sand/40 text-left text-xs font-semibold uppercase tracking-[0.18em] text-brand-muted">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Roles</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user, index) => (
              <tr key={user.id} className={index % 2 === 0 ? 'bg-white' : 'bg-brand-green/5'}>
                <td className="px-3 py-2 text-brand-forest">{user.name}</td>
                <td className="px-3 py-2 text-brand-forest">{user.email}</td>
                <td className="px-3 py-2 text-brand-forest">
                  {Array.isArray(user.roles) && user.roles.length
                    ? user.roles.map((role) => formatRole(role)).join(', ')
                    : user.role
                    ? formatRole(user.role)
                    : '—'}
                </td>
                <td className="px-3 py-2 text-brand-forest">
                  {user.isActive === false ? (
                    <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">Inactive</span>
                  ) : (
                    <span className="rounded-full bg-brand-green/10 px-2 py-1 text-xs font-semibold text-brand-green">Active</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardCard>
  );
}
