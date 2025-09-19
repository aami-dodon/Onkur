import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import useDocumentTitle from '../../lib/useDocumentTitle';
import AdminOverviewCards from '../admin/AdminOverviewCards';
import ModerationQueues from '../admin/ModerationQueues';
import UserManagementPanel from '../admin/UserManagementPanel';
import ReportingPanel from '../admin/ReportingPanel';
import {
  fetchModerationQueue,
  approveEntity,
  rejectEntity,
  patchUser,
  fetchOverview,
  exportAdminData,
} from '../admin/api';
import ImpactAnalyticsPanel from '../admin/ImpactAnalyticsPanel';
import { fetchImpactAnalytics, exportImpactAnalytics } from '../impact/impactApi';

export default function AdminDashboard() {
  const { token, roles, fetchUsers } = useAuth();
  const [overview, setOverview] = useState(null);
  const [overviewState, setOverviewState] = useState({ status: 'idle', error: '' });
  const [queueType, setQueueType] = useState('events');
  const [queueState, setQueueState] = useState({ status: 'idle', error: '', data: { items: [] } });
  const [notes, setNotes] = useState({});
  const [users, setUsers] = useState([]);
  const [userState, setUserState] = useState({ status: 'idle', error: '', message: '' });
  const [userForm, setUserForm] = useState({ userId: '', roles: [], isActive: true });
  const [exportState, setExportState] = useState({ entity: '', format: 'csv', status: 'idle', error: '' });
  const [exportFormat, setExportFormat] = useState('csv');
  const [impactAnalytics, setImpactAnalytics] = useState(null);
  const [impactState, setImpactState] = useState({ status: 'idle', error: '' });
  const [impactExportState, setImpactExportState] = useState({ status: 'idle', error: '' });
  useDocumentTitle('Onkur | Operations center 🌿');

  const roleOptions = useMemo(() => roles, [roles]);

  const loadOverview = useCallback(async () => {
    if (!token) return;
    setOverviewState({ status: 'loading', error: '' });
    try {
      const response = await fetchOverview({ token });
      setOverview(response.overview || null);
      setOverviewState({ status: 'success', error: '' });
    } catch (error) {
      setOverviewState({ status: 'error', error: error.message || 'Unable to load overview' });
    }
  }, [token]);

  const loadImpactAnalytics = useCallback(async () => {
    if (!token) return;
    setImpactState({ status: 'loading', error: '' });
    try {
      const response = await fetchImpactAnalytics({ token });
      setImpactAnalytics(response.overview || null);
      setImpactState({ status: 'success', error: '' });
    } catch (error) {
      setImpactState({ status: 'error', error: error.message || 'Unable to load impact analytics' });
    }
  }, [token]);

  const loadQueue = useCallback(
    async (typeToLoad = queueType) => {
      if (!token) return;
      setQueueState((prev) => ({ ...prev, status: 'loading', error: '' }));
      try {
        const data = await fetchModerationQueue({ token, type: typeToLoad });
        setQueueState({ status: 'success', error: '', data });
      } catch (error) {
        setQueueState({ status: 'error', error: error.message || 'Unable to load moderation queue', data: { items: [] } });
      }
    },
    [queueType, token]
  );

  const loadUsers = useCallback(async () => {
    if (!fetchUsers) return;
    setUserState((prev) => ({ ...prev, status: 'loading', error: '', message: '' }));
    try {
      const fetched = await fetchUsers();
      setUsers(Array.isArray(fetched) ? fetched : []);
      setUserState((prev) => ({ ...prev, status: 'idle' }));
    } catch (error) {
      setUserState({ status: 'error', error: error.message || 'Unable to load users', message: '' });
    }
  }, [fetchUsers]);

  useEffect(() => {
    if (!token) {
      return;
    }
    loadOverview();
    loadQueue(queueType);
    loadUsers();
    loadImpactAnalytics();
  }, [token, loadOverview, loadQueue, loadUsers, loadImpactAnalytics, queueType]);

  useEffect(() => {
    if (!roleOptions.length) {
      return;
    }
    setUserForm((prev) => {
      if (!prev.roles.length) {
        return { ...prev, roles: [roleOptions[0]], isActive: true };
      }
      const filtered = prev.roles.filter((role) => roleOptions.includes(role));
      return { ...prev, roles: filtered.length ? filtered : [roleOptions[0]] };
    });
  }, [roleOptions]);

  const handleNoteChange = useCallback((id, value) => {
    setNotes((prev) => ({ ...prev, [id]: value }));
  }, []);

  const handleTypeChange = useCallback(
    (nextType) => {
      setQueueType(nextType);
      setNotes({});
      loadQueue(nextType);
    },
    [loadQueue]
  );

  const handleApprove = useCallback(
    async (entityType, entityId) => {
      if (!token) return;
      try {
        await approveEntity({ token, entityType, entityId });
        setNotes((prev) => {
          const next = { ...prev };
          delete next[entityId];
          return next;
        });
        await Promise.all([loadQueue(entityType), loadOverview(), loadImpactAnalytics()]);
      } catch (error) {
        setQueueState((prev) => ({ ...prev, error: error.message || 'Unable to approve item' }));
      }
    },
    [token, loadQueue, loadOverview, loadImpactAnalytics]
  );

  const handleReject = useCallback(
    async (entityType, entityId, note) => {
      if (!token) return;
      try {
        await rejectEntity({ token, entityType, entityId, note });
        setNotes((prev) => {
          const next = { ...prev };
          delete next[entityId];
          return next;
        });
        await Promise.all([loadQueue(entityType), loadOverview(), loadImpactAnalytics()]);
      } catch (error) {
        setQueueState((prev) => ({ ...prev, error: error.message || 'Unable to reject item' }));
      }
    },
    [token, loadQueue, loadOverview, loadImpactAnalytics]
  );

  const handleFormChange = useCallback(
    (changes) => {
      setUserState((prev) => ({ ...prev, message: '', error: prev.status === 'error' ? prev.error : '' }));
      setUserForm((prev) => {
        if (Object.prototype.hasOwnProperty.call(changes, 'userId')) {
          const selected = users.find((entry) => entry.id === changes.userId);
          return {
            userId: changes.userId,
            roles:
              selected && Array.isArray(selected.roles) && selected.roles.length
                ? selected.roles
                : roleOptions.length
                ? [roleOptions[0]]
                : [],
            isActive: selected ? selected.isActive !== false : true,
          };
        }
        return { ...prev, ...changes };
      });
    },
    [roleOptions, users]
  );

  const handleUserSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      if (!userForm.userId || !userForm.roles.length) {
        setUserState({ status: 'error', error: 'Select a user and at least one role', message: '' });
        return;
      }
      if (!token) {
        setUserState({ status: 'error', error: 'Authentication required', message: '' });
        return;
      }
      setUserState({ status: 'loading', error: '', message: '' });
      try {
        const response = await patchUser({
          token,
          userId: userForm.userId,
          roles: userForm.roles,
          isActive: userForm.isActive,
        });
        const updated = response.user;
        setUsers((prev) => prev.map((entry) => (entry.id === updated.id ? { ...entry, ...updated } : entry)));
        setUserState({ status: 'idle', error: '', message: 'User updated successfully.' });
        loadOverview();
      } catch (error) {
        setUserState({ status: 'error', error: error.message || 'Unable to update user', message: '' });
      }
    },
    [token, userForm, loadOverview]
  );

  const handleExport = useCallback(
    async (entity, formatOverride) => {
      if (!token) return;
      const formatToUse = formatOverride || exportFormat || 'csv';
      setExportState({ entity, format: formatToUse, status: 'loading', error: '' });
      try {
        const { blob, filename } = await exportAdminData({ token, entity, format: formatToUse });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const fallbackName = `onkur-${entity}-${Date.now()}.${formatToUse === 'excel' ? 'xls' : 'csv'}`;
        link.download = filename || fallbackName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        setExportState({ entity: '', format: formatToUse, status: 'idle', error: '' });
      } catch (error) {
        setExportState({ entity: '', format: formatToUse, status: 'error', error: error.message || 'Export failed' });
      }
    },
    [token, exportFormat]
  );

  const handleImpactExport = useCallback(async () => {
    if (!token) return;
    setImpactExportState({ status: 'loading', error: '' });
    try {
      const { blob, filename } = await exportImpactAnalytics({ token });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `onkur-impact-analytics-${Date.now()}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setImpactExportState({ status: 'idle', error: '' });
    } catch (error) {
      setImpactExportState({ status: 'error', error: error.message || 'Unable to export analytics' });
    }
  }, [token]);

  const handleFormatChange = useCallback((value) => {
    setExportFormat(value);
    setExportState((prev) => ({ ...prev, format: value }));
  }, []);

  return (
    <div className="grid gap-5 md:[grid-template-columns:repeat(auto-fit,minmax(320px,1fr))]">
      <header className="flex flex-col gap-2 md:col-span-full">
        <h2 className="m-0 font-display text-2xl font-semibold text-brand-forest">Operations center 🌿</h2>
        <p className="m-0 text-sm text-brand-muted sm:text-base">
          Review submissions, steer sponsorships, and keep the community roster current.
        </p>
      </header>

      <AdminOverviewCards
        overview={overview}
        loading={overviewState.status === 'loading'}
        error={overviewState.error}
      />

      <ModerationQueues
        type={queueType}
        queue={queueState.data}
        notes={notes}
        onTypeChange={handleTypeChange}
        onApprove={handleApprove}
        onReject={handleReject}
        onNoteChange={handleNoteChange}
        loading={queueState.status === 'loading'}
        error={queueState.error}
      />

      <UserManagementPanel
        users={users}
        roles={roleOptions}
        form={userForm}
        onFormChange={handleFormChange}
        onSubmit={handleUserSubmit}
        state={userState}
        onRefresh={loadUsers}
      />

      <ImpactAnalyticsPanel
        metrics={impactAnalytics}
        state={impactState}
        onRefresh={loadImpactAnalytics}
        onExport={handleImpactExport}
        exporting={impactExportState.status === 'loading'}
        exportError={impactExportState.error}
      />

      <ReportingPanel
        onExport={handleExport}
        exportState={exportState}
        format={exportFormat}
        onFormatChange={handleFormatChange}
      />
    </div>
  );
}
