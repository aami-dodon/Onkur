import { useEffect, useMemo, useState } from 'react';
import DashboardCard from './DashboardCard';
import { useAuth } from '../auth/AuthContext';

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
  const [form, setForm] = useState({ userId: '', role: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

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
    if (roles.length && !form.role) {
      setForm((prev) => ({ ...prev, role: roles[0] }));
    }
  }, [roles, form.role]);

  const roleOptions = useMemo(() => roles, [roles]);

  const handleAssign = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');

    if (!form.userId || !form.role) {
      setError('Select a user and role');
      return;
    }

    try {
      const updated = await assignRole({ userId: form.userId, role: form.role });
      setUsers((prev) => prev.map((entry) => (entry.id === updated.id ? updated : entry)));
      setMessage(`Updated role to ${formatRole(updated.role)}.`);
    } catch (err) {
      setError(err.message || 'Unable to update role');
    }
  };

  return (
    <div className="dashboard-grid">
      <header className="dashboard-header">
        <h2>Operations center 🌿</h2>
        <p>Manage the health of the Onkur ecosystem, assign roles, and monitor authentication signals.</p>
      </header>

      <DashboardCard
        title="Authentication signals"
        description="Quick pulse on signups and login performance. Detailed analytics arrive with the metrics service."
      >
        <ul style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--muted-text)' }}>
          <li>Signups today: <strong>0</strong></li>
          <li>Login success rate: <strong>100%</strong> (initial baseline)</li>
          <li>Auth error rate: <strong>0%</strong> (monitor via audit log)</li>
        </ul>
      </DashboardCard>

      <DashboardCard
        title="Assign roles"
        description="Elevate trusted community members into managers or sponsors. Admins guard access for now."
      >
        <form onSubmit={handleAssign} className="auth-form" style={{ gap: '1rem' }}>
          <div className="form-field">
            <label htmlFor="userId">Select user</label>
            <select
              id="userId"
              name="userId"
              value={form.userId}
              onChange={(event) => setForm((prev) => ({ ...prev, userId: event.target.value }))}
            >
              <option value="">Choose a user</option>
              {users.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name} · {entry.email}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="role">Role</label>
            <select
              id="role"
              name="role"
              value={form.role}
              onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value }))}
            >
              <option value="">Choose a role</option>
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {formatRole(role)}
                </option>
              ))}
            </select>
          </div>
          {error ? <p className="form-error">{error}</p> : null}
          {message ? <p style={{ color: 'var(--green-primary)', fontWeight: 600 }}>{message}</p> : null}
          <button type="submit" className="btn-primary">
            Assign role
          </button>
        </form>
      </DashboardCard>

      <DashboardCard
        title="Community directory"
        description="A quick overview of everyone with access today. Search and filters are on the roadmap."
      >
        {loading ? (
          <p style={{ margin: 0 }}>Loading members…</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="user-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                </tr>
              </thead>
              <tbody>
                {users.map((entry) => (
                  <tr key={entry.id}>
                    <td>{entry.name}</td>
                    <td>{entry.email}</td>
                    <td>{formatRole(entry.role)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 ? <p style={{ margin: '0.5rem 0' }}>No members yet. Start by inviting volunteers.</p> : null}
          </div>
        )}
      </DashboardCard>
    </div>
  );
}
