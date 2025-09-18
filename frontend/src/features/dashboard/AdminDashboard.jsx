import { useEffect, useMemo, useState } from 'react';
import DashboardCard from './DashboardCard';
import { useAuth } from '../auth/AuthContext';
import useDocumentTitle from '../../lib/useDocumentTitle';

function formatRole(role) {
  return role
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default function AdminDashboard() {
  const { roles, fetchUsers, assignRole } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ userId: '', roles: [] });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  useDocumentTitle('Onkur | Operations center 🌿');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const fetched = await fetchUsers();
        if (active) {
          setUsers(fetched);
        }
      } catch (err) {
        if (active) {
          setError(err.message || 'Unable to load users');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [fetchUsers]);

  useEffect(() => {
    if (!roles.length) {
      return;
    }
    setForm((prev) => {
      if (prev.roles.length) {
        const filtered = prev.roles.filter((role) => roles.includes(role));
        return { ...prev, roles: filtered.length ? filtered : [roles[0]] };
      }
      return { ...prev, roles: [roles[0]] };
    });
  }, [roles]);

  const roleOptions = useMemo(() => roles, [roles]);

  const handleAssign = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');

    if (!form.userId || !form.roles.length) {
      setError('Select a user and at least one role');
      return;
    }

    try {
      const updated = await assignRole({ userId: form.userId, roles: form.roles });
      setUsers((prev) => prev.map((entry) => (entry.id === updated.id ? updated : entry)));
      setMessage(`Updated roles to ${updated.roles.map((role) => formatRole(role)).join(', ')}.`);
    } catch (err) {
      setError(err.message || 'Unable to update role');
    }
  };

  const handleUserChange = (event) => {
    const userId = event.target.value;
    const selectedUser = users.find((entry) => entry.id === userId);
    setForm({
      userId,
      roles: selectedUser && Array.isArray(selectedUser.roles) && selectedUser.roles.length ? selectedUser.roles : roleOptions.slice(0, 1),
    });
  };

  const toggleRole = (role) => {
    setForm((prev) => {
      const hasRole = prev.roles.includes(role);
      const nextRoles = hasRole ? prev.roles.filter((entry) => entry !== role) : [...prev.roles, role];
      return { ...prev, roles: nextRoles };
    });
  };

  return (
    <div className="grid gap-5 md:[grid-template-columns:repeat(auto-fit,minmax(320px,1fr))]">
      <header className="flex flex-col gap-2 md:col-span-full">
        <h2 className="m-0 font-display text-2xl font-semibold text-brand-forest">Operations center 🌿</h2>
        <p className="m-0 text-sm text-brand-muted sm:text-base">
          Manage the health of the Onkur ecosystem, assign roles, and monitor authentication signals.
        </p>
      </header>

      <DashboardCard
        title="Authentication signals"
        description="Quick pulse on signups and login performance. Detailed analytics arrive with the metrics service."
      >
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-brand-muted">
          <li>
            Signups today: <strong className="text-brand-forest">0</strong>
          </li>
          <li>
            Login success rate: <strong className="text-brand-forest">100%</strong> (initial baseline)
          </li>
          <li>
            Auth error rate: <strong className="text-brand-forest">0%</strong> (monitor via audit log)
          </li>
        </ul>
      </DashboardCard>

      <DashboardCard
        title="Assign roles"
        description="Elevate trusted community members into managers or sponsors. Admins guard access for now."
      >
        <form onSubmit={handleAssign} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-brand-muted" htmlFor="userId">
              Select user
            </label>
            <select
              id="userId"
              name="userId"
              value={form.userId}
              onChange={handleUserChange}
              className="w-full rounded-md border border-brand-green/40 bg-white/90 px-3 py-3 text-base shadow-sm transition focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/40"
            >
              <option value="">Choose a user</option>
              {users.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name} · {entry.email}
                </option>
              ))}
            </select>
          </div>
          <fieldset className="flex flex-col gap-3 rounded-md border border-brand-green/30 bg-brand-sand/20 px-3 py-3">
            <legend className="px-2 text-xs font-semibold uppercase tracking-[0.2em] text-brand-muted">
              Roles
            </legend>
            {roleOptions.map((role) => {
              const inputId = `admin-role-${role.toLowerCase()}`;
              const checked = form.roles.includes(role);
              return (
                <label key={role} htmlFor={inputId} className="flex items-center justify-between gap-3 rounded-md border border-brand-green/40 bg-white/80 px-3 py-2">
                  <span className="text-sm font-medium text-brand-forest">{formatRole(role)}</span>
                  <input
                    id={inputId}
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleRole(role)}
                    className="h-4 w-4 rounded border-brand-green text-brand-green focus:ring-brand-green"
                  />
                </label>
              );
            })}
          </fieldset>
          {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
          {message ? <p className="text-sm font-semibold text-brand-green">{message}</p> : null}
          <button type="submit" className="btn-primary">
            Assign role
          </button>
        </form>
      </DashboardCard>

      <DashboardCard
        title="Community directory"
        description="A quick overview of everyone with access today. Search and filters are on the roadmap."
        className="md:col-span-full"
      >
        {loading ? (
          <p className="m-0 text-sm text-brand-muted">Loading members…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-brand-sky/20 text-brand-muted">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Name</th>
                  <th className="px-3 py-2 text-left font-semibold">Email</th>
                  <th className="px-3 py-2 text-left font-semibold">Role</th>
                </tr>
              </thead>
              <tbody>
                {users.map((entry, index) => (
                  <tr key={entry.id} className={index % 2 === 0 ? 'bg-white' : 'bg-brand-green/5'}>
                    <td className="px-3 py-2 text-brand-forest">{entry.name}</td>
                    <td className="px-3 py-2 text-brand-forest">{entry.email}</td>
                    <td className="px-3 py-2 text-brand-forest">
                      {Array.isArray(entry.roles) && entry.roles.length
                        ? entry.roles.map((role) => formatRole(role)).join(', ')
                        : formatRole(entry.role)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 ? (
              <p className="mt-3 text-sm text-brand-muted">No members yet. Start by inviting volunteers.</p>
            ) : null}
          </div>
        )}
      </DashboardCard>
    </div>
  );
}
