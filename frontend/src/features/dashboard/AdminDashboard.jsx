import { useEffect, useState } from 'react';
import useDocumentTitle from '../../lib/useDocumentTitle';
import { useAuth } from '../auth/AuthContext';
import useAdminConsole from '../admin/useAdminConsole';
import ModerationQueue from '../admin/ModerationQueue';
import ReportsPanel from '../admin/ReportsPanel';
import ExportTools from '../admin/ExportTools';
import UserManagementPanel from '../admin/UserManagementPanel';

export default function AdminDashboard() {
  useDocumentTitle('Onkur | Admin console');
  const { roles, fetchUsers } = useAuth();
  const { loadModerationQueue, approveItem, rejectItem, fetchOverview, updateUser, downloadExport } = useAdminConsole();

  const [queue, setQueue] = useState({ events: [], sponsors: [], media: [] });
  const [queueStatus, setQueueStatus] = useState({ loading: true, error: '' });
  const [report, setReport] = useState(null);
  const [reportStatus, setReportStatus] = useState({ loading: true, error: '' });
  const [users, setUsers] = useState([]);
  const [userStatus, setUserStatus] = useState({ loading: false, error: '', message: '' });
  const [busyModerationId, setBusyModerationId] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [initialQueue, initialReport, userList] = await Promise.all([
          loadModerationQueue(),
          fetchOverview(),
          fetchUsers(),
        ]);
        if (!active) return;
        setQueue({
          events: Array.isArray(initialQueue?.events) ? initialQueue.events : [],
          sponsors: Array.isArray(initialQueue?.sponsors) ? initialQueue.sponsors : [],
          media: Array.isArray(initialQueue?.media) ? initialQueue.media : [],
        });
        setQueueStatus({ loading: false, error: '' });
        setReport(initialReport);
        setReportStatus({ loading: false, error: '' });
        setUsers(Array.isArray(userList) ? userList : userList?.users || []);
      } catch (error) {
        if (!active) return;
        setQueueStatus({ loading: false, error: error.message || 'Unable to load moderation queue' });
        try {
          const userList = await fetchUsers();
          if (active) {
            setUsers(Array.isArray(userList) ? userList : userList?.users || []);
          }
        } catch (userError) {
          if (active) {
            setUsers([]);
          }
        }
        setReportStatus({ loading: false, error: error.message || 'Unable to load reports' });
      }
    })();
    return () => {
      active = false;
    };
  }, [fetchOverview, fetchUsers, loadModerationQueue]);

  const refreshQueue = async () => {
    try {
      setQueueStatus((prev) => ({ ...prev, loading: true, error: '' }));
      const updatedQueue = await loadModerationQueue();
      setQueue({
        events: Array.isArray(updatedQueue?.events) ? updatedQueue.events : [],
        sponsors: Array.isArray(updatedQueue?.sponsors) ? updatedQueue.sponsors : [],
        media: Array.isArray(updatedQueue?.media) ? updatedQueue.media : [],
      });
      setQueueStatus({ loading: false, error: '' });
    } catch (error) {
      setQueueStatus({ loading: false, error: error.message || 'Unable to refresh moderation queue' });
    }
  };

  const refreshReport = async () => {
    try {
      setReportStatus((prev) => ({ ...prev, loading: true, error: '' }));
      const nextReport = await fetchOverview();
      setReport(nextReport);
      setReportStatus({ loading: false, error: '' });
    } catch (error) {
      setReportStatus({ loading: false, error: error.message || 'Unable to refresh report' });
    }
  };

  const handleApprove = async ({ type, id }) => {
    try {
      setBusyModerationId(id);
      await approveItem({ entityType: type, entityId: id });
      await refreshQueue();
    } catch (error) {
      setQueueStatus({ loading: false, error: error.message || 'Unable to complete approval' });
    } finally {
      setBusyModerationId(null);
    }
  };

  const handleReject = async ({ type, id }) => {
    try {
      const reason = window.prompt('Add a note for this rejection (optional):') || null;
      setBusyModerationId(id);
      await rejectItem({ entityType: type, entityId: id, reason });
      await refreshQueue();
    } catch (error) {
      setQueueStatus({ loading: false, error: error.message || 'Unable to complete rejection' });
    } finally {
      setBusyModerationId(null);
    }
  };

  const handleUserUpdate = async ({ userId, roles: nextRoles, isActive }) => {
    try {
      setUserStatus({ loading: true, error: '', message: '' });
      const response = await updateUser({ userId, roles: nextRoles, isActive });
      const updated = response?.user;
      if (updated) {
        setUsers((prev) => prev.map((entry) => (entry.id === updated.id ? { ...entry, ...updated } : entry)));
      }
      setUserStatus({ loading: false, error: '', message: 'User updated successfully.' });
    } catch (error) {
      setUserStatus({ loading: false, error: error.message || 'Unable to update user', message: '' });
    }
  };

  return (
    <div className="grid gap-5">
      <header className="flex flex-col gap-2">
        <h2 className="m-0 font-display text-2xl font-semibold text-brand-forest">Operations centre 🌿</h2>
        <p className="m-0 text-sm text-brand-muted sm:text-base">
          Moderate submissions, steer user access, and keep a pulse on platform health.
        </p>
        {queueStatus.error ? (
          <p className="text-sm font-semibold text-red-600">{queueStatus.error}</p>
        ) : null}
        {reportStatus.error ? (
          <p className="text-sm font-semibold text-red-600">{reportStatus.error}</p>
        ) : null}
      </header>

      <ModerationQueue queue={queue} onApprove={handleApprove} onReject={handleReject} busyId={busyModerationId} />

      <ReportsPanel report={report} onRefresh={refreshReport} loading={reportStatus.loading} />

      <div className="grid gap-5 md:grid-cols-2">
        <ExportTools onExport={downloadExport} />
        <UserManagementPanel
          users={users}
          availableRoles={roles}
          onSubmit={handleUserUpdate}
          status={userStatus}
        />
      </div>
    </div>
  );
}
