import { useEffect, useMemo, useState } from 'react';
import { apiRequest, API_BASE } from '../../lib/apiClient';
import { useAuth } from '../auth/AuthContext';
import useReferenceData from '../../lib/useReferenceData';

function formatDate(value) {
  if (!value) return 'TBD';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'TBD';
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function summarize(text, max = 160) {
  if (!text) return '';
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

const initialForm = {
  title: '',
  description: '',
  category: '',
  theme: '',
  dateStart: '',
  dateEnd: '',
  location: '',
  capacity: 10,
  requirements: '',
};

export default function EventManagerWorkspace() {
  const { token } = useAuth();
  const [events, setEvents] = useState([]);
  const [listState, setListState] = useState({ status: 'idle', error: '' });
  const [form, setForm] = useState(initialForm);
  const [createState, setCreateState] = useState({ status: 'idle', message: '' });
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailState, setDetailState] = useState({ status: 'idle', error: '' });
  const [taskDrafts, setTaskDrafts] = useState([]);
  const [taskState, setTaskState] = useState({ status: 'idle', message: '' });
  const [assignmentState, setAssignmentState] = useState({ status: 'idle', message: '' });
  const [attendanceState, setAttendanceState] = useState({});
  const [report, setReport] = useState(null);
  const [reportState, setReportState] = useState({ status: 'idle', error: '' });
  const { data: referenceData, status: referenceStatus } = useReferenceData();

  const locationOptions = referenceData?.locations || [];
  const locationSuggestions = useMemo(
    () => locationOptions.map((option) => option.label),
    [locationOptions],
  );
  const referenceReady = referenceStatus === 'success';

  const authHeaders = useMemo(
    () => ({ token }),
    [token],
  );

  useEffect(() => {
    if (token) {
      refreshEvents();
    }
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (detail?.tasks) {
      setTaskDrafts(
        detail.tasks.map((task) => ({
          id: task.id,
          title: task.title,
          description: task.description || '',
          requiredCount: task.requiredCount || 1,
        })),
      );
    }
  }, [detail?.tasks]);

  const selectedEvent = useMemo(() => {
    if (!selectedId) return null;
    return events.find((event) => event.id === selectedId) || null;
  }, [events, selectedId]);

  async function refreshEvents() {
    setListState({ status: 'loading', error: '' });
    try {
      const response = await apiRequest('/api/manager/events', authHeaders);
      setEvents(response.events || []);
      setListState({ status: 'success', error: '' });
    } catch (error) {
      setListState({ status: 'error', error: error.message || 'Unable to load events' });
    }
  }

  async function refreshDetail(eventId) {
    setDetailState({ status: 'loading', error: '' });
    try {
      const response = await apiRequest(`/api/manager/events/${eventId}`, authHeaders);
      setDetail(response);
      setDetailState({ status: 'success', error: '' });
      setReport(null);
    } catch (error) {
      setDetailState({ status: 'error', error: error.message || 'Unable to load event details' });
    }
  }

  const availableVolunteers = useMemo(() => {
    if (!detail?.signups) return [];
    return detail.signups.map((signup) => ({
      userId: signup.userId,
      name: signup.name || 'Volunteer',
      email: signup.email,
    }));
  }, [detail?.signups]);

  const assignmentOptions = useMemo(() => {
    if (!detail?.tasks) return [];
    return detail.tasks.map((task) => ({
      id: task.id,
      label: `${task.title} · needs ${task.requiredCount}`,
    }));
  }, [detail?.tasks]);

  const existingAssignments = useMemo(() => detail?.assignments || [], [detail?.assignments]);

  const checkedInCount = detail?.signups?.filter((signup) => Boolean(signup.checkInAt))?.length || 0;
  const totalMinutes = detail?.event?.totalMinutes || 0;

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setCreateState({ status: 'loading', message: '' });
    try {
      const payload = {
        ...form,
        capacity: Number(form.capacity) || 1,
      };
      const response = await apiRequest('/api/manager/events', {
        ...authHeaders,
        method: 'POST',
        body: payload,
      });
      setCreateState({ status: 'success', message: 'Draft saved' });
      setForm(initialForm);
      await refreshEvents();
      if (response?.event?.id) {
        setSelectedId(response.event.id);
        await refreshDetail(response.event.id);
      }
    } catch (error) {
      setCreateState({ status: 'error', message: error.message || 'Unable to create event' });
    }
  };

  const handlePublish = async (eventId) => {
    setListState((prev) => ({ ...prev, status: 'loading' }));
    try {
      await apiRequest(`/api/manager/events/${eventId}/publish`, {
        ...authHeaders,
        method: 'POST',
      });
      await refreshEvents();
      if (selectedId === eventId) {
        await refreshDetail(eventId);
      }
    } catch (error) {
      setListState({ status: 'error', error: error.message || 'Unable to publish event' });
    }
  };

  const handleComplete = async (eventId) => {
    try {
      await apiRequest(`/api/manager/events/${eventId}/complete`, {
        ...authHeaders,
        method: 'POST',
      });
      await refreshEvents();
      if (selectedId === eventId) {
        await refreshDetail(eventId);
      }
    } catch (error) {
      setListState({ status: 'error', error: error.message || 'Unable to complete event' });
    }
  };

  const handleSelectEvent = async (eventId) => {
    setSelectedId(eventId);
    await refreshDetail(eventId);
  };

  const handleTaskFieldChange = (taskId, field, value) => {
    setTaskDrafts((prev) =>
      prev.map((task) => (task.id === taskId ? { ...task, [field]: field === 'requiredCount' ? Number(value) : value } : task)),
    );
  };

  const handleAddTask = () => {
    const tempId = `temp-${Date.now()}`;
    setTaskDrafts((prev) => [
      ...prev,
      { id: tempId, title: '', description: '', requiredCount: 1 },
    ]);
  };

  const handleRemoveTask = (taskId) => {
    setTaskDrafts((prev) => prev.filter((task) => task.id !== taskId));
  };

  const handleSaveTasks = async () => {
    if (!selectedId) return;
    setTaskState({ status: 'loading', message: '' });
    try {
      const payload = taskDrafts
        .filter((task) => task.title.trim())
        .map((task) => ({
          id: task.id.startsWith('temp-') ? undefined : task.id,
          title: task.title,
          description: task.description,
          requiredCount: Number(task.requiredCount) || 1,
        }));
      const response = await apiRequest(`/api/manager/events/${selectedId}/tasks`, {
        ...authHeaders,
        method: 'POST',
        body: payload,
      });
      setTaskDrafts(
        (response.tasks || []).map((task) => ({
          id: task.id,
          title: task.title,
          description: task.description || '',
          requiredCount: task.requiredCount || 1,
        })),
      );
      setTaskState({ status: 'success', message: 'Tasks updated' });
      await refreshDetail(selectedId);
    } catch (error) {
      setTaskState({ status: 'error', message: error.message || 'Unable to update tasks' });
    }
  };

  const handleAssign = async (event) => {
    event.preventDefault();
    if (!selectedId) return;
    const data = new FormData(event.target);
    const taskId = data.get('taskId');
    const userId = data.get('userId');
    if (!taskId || !userId) {
      setAssignmentState({ status: 'error', message: 'Select a task and volunteer' });
      return;
    }
    setAssignmentState({ status: 'loading', message: '' });
    try {
      const response = await apiRequest(`/api/manager/events/${selectedId}/tasks/assignments`, {
        ...authHeaders,
        method: 'POST',
        body: [{ taskId, userId }],
      });
      setDetail((prev) => ({
        ...prev,
        assignments: response.assignments || [],
      }));
      setAssignmentState({ status: 'success', message: 'Volunteer assigned' });
      event.target.reset();
    } catch (error) {
      setAssignmentState({ status: 'error', message: error.message || 'Unable to assign volunteer' });
    }
  };

  const handleAttendance = async (signup, action) => {
    if (!selectedId) return;
    setAttendanceState((prev) => ({ ...prev, [signup.userId]: { status: 'loading' } }));
    try {
      const response = await apiRequest(`/api/manager/events/${selectedId}/check-in/${signup.userId}`, {
        ...authHeaders,
        method: 'POST',
        body: { action },
      });
      const attendance = response.attendance;
      setDetail((prev) => {
        const updatedSignups = (prev.signups || []).map((item) =>
          item.userId === signup.userId
            ? {
                ...item,
                checkInAt: attendance.checkInAt,
                checkOutAt: attendance.checkOutAt,
                minutes: attendance.minutes,
              }
            : item,
        );
        const updatedCheckedIn = updatedSignups.filter((item) => item.checkInAt).length;
        setEvents((eventsList) =>
          eventsList.map((event) =>
            event.id === selectedId ? { ...event, checkedInCount: updatedCheckedIn } : event,
          ),
        );
        return {
          ...prev,
          signups: updatedSignups,
        };
      });
      setAttendanceState((prev) => ({ ...prev, [signup.userId]: { status: 'success', action } }));
    } catch (error) {
      setAttendanceState((prev) => ({
        ...prev,
        [signup.userId]: { status: 'error', message: error.message || 'Unable to update attendance' },
      }));
    }
  };

  const handleReport = async () => {
    if (!selectedId) return;
    setReportState({ status: 'loading', error: '' });
    try {
      const response = await apiRequest(`/api/manager/events/${selectedId}/report`, authHeaders);
      setReport(response.report);
      setReportState({ status: 'success', error: '' });
    } catch (error) {
      setReportState({ status: 'error', error: error.message || 'Unable to generate report' });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl border border-brand-forest/10 bg-white p-5 shadow-[0_18px_40px_rgba(47,133,90,0.08)]">
        <header className="flex flex-col gap-1 pb-4">
          <h3 className="m-0 text-xl font-semibold text-brand-forest">Plan a new event</h3>
          <p className="m-0 text-sm text-brand-muted">
            Draft the essentials now and publish when you&apos;re ready for volunteers to join.
          </p>
        </header>
        <form className="grid gap-3 sm:[grid-template-columns:repeat(2,minmax(0,1fr))]" onSubmit={handleCreate}>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold text-brand-forest">Title</span>
            <input
              required
              name="title"
              className="rounded-lg border border-brand-forest/20 bg-brand-sand/30 px-3 py-2 text-sm shadow-sm focus:border-brand-green focus:outline-none"
              value={form.title}
              onChange={handleFormChange}
              placeholder="Community shoreline cleanup"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold text-brand-forest">Category</span>
            <input
              required
              name="category"
              className="rounded-lg border border-brand-forest/20 bg-brand-sand/30 px-3 py-2 text-sm shadow-sm focus:border-brand-green focus:outline-none"
              value={form.category}
              onChange={handleFormChange}
              placeholder="Cleanup, planting, education"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="font-semibold text-brand-forest">Description</span>
            <textarea
              required
              name="description"
              className="min-h-[96px] rounded-lg border border-brand-forest/20 bg-brand-sand/30 px-3 py-2 text-sm shadow-sm focus:border-brand-green focus:outline-none"
              value={form.description}
              onChange={handleFormChange}
              placeholder="Share the mission, who you&apos;re supporting, and what to expect."
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold text-brand-forest">Theme (optional)</span>
            <input
              name="theme"
              className="rounded-lg border border-brand-forest/20 bg-brand-sand/30 px-3 py-2 text-sm shadow-sm focus:border-brand-green focus:outline-none"
              value={form.theme}
              onChange={handleFormChange}
              placeholder="Biodiversity, youth, climate"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold text-brand-forest">Location</span>
            <input
              required
              name="location"
              type="text"
              className="rounded-lg border border-brand-forest/20 bg-brand-sand/30 px-3 py-2 text-sm shadow-sm focus:border-brand-green focus:outline-none"
              value={form.location}
              onChange={handleFormChange}
              placeholder="City, region, or virtual"
              list={locationSuggestions.length ? 'event-location-suggestions' : undefined}
            />
            {locationSuggestions.length ? (
              <datalist id="event-location-suggestions">
                {locationSuggestions.map((label) => (
                  <option key={label} value={label} />
                ))}
              </datalist>
            ) : null}
            {!referenceReady ? (
              <span className="text-xs text-brand-muted">Loading location suggestions…</span>
            ) : null}
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold text-brand-forest">Starts</span>
            <input
              required
              type="datetime-local"
              name="dateStart"
              className="rounded-lg border border-brand-forest/20 bg-brand-sand/30 px-3 py-2 text-sm shadow-sm focus:border-brand-green focus:outline-none"
              value={form.dateStart}
              onChange={handleFormChange}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold text-brand-forest">Ends</span>
            <input
              required
              type="datetime-local"
              name="dateEnd"
              className="rounded-lg border border-brand-forest/20 bg-brand-sand/30 px-3 py-2 text-sm shadow-sm focus:border-brand-green focus:outline-none"
              value={form.dateEnd}
              onChange={handleFormChange}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold text-brand-forest">Capacity</span>
            <input
              required
              type="number"
              min="1"
              name="capacity"
              className="rounded-lg border border-brand-forest/20 bg-brand-sand/30 px-3 py-2 text-sm shadow-sm focus:border-brand-green focus:outline-none"
              value={form.capacity}
              onChange={handleFormChange}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="font-semibold text-brand-forest">Requirements</span>
            <textarea
              name="requirements"
              className="min-h-[72px] rounded-lg border border-brand-forest/20 bg-brand-sand/30 px-3 py-2 text-sm shadow-sm focus:border-brand-green focus:outline-none"
              value={form.requirements}
              onChange={handleFormChange}
              placeholder="Safety notes, attire, supplies to bring"
            />
          </label>
          <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
            <button
              type="submit"
              className="btn-primary"
              disabled={createState.status === 'loading'}
            >
              {createState.status === 'loading' ? 'Saving…' : 'Save draft'}
            </button>
            {createState.message ? (
              <span
                className={`text-xs font-semibold ${
                  createState.status === 'error' ? 'text-red-600' : 'text-brand-green'
                }`}
              >
                {createState.message}
              </span>
            ) : null}
          </div>
        </form>
      </section>

      <section className="flex flex-col gap-4">
        <header className="flex flex-col gap-1">
          <h3 className="m-0 text-xl font-semibold text-brand-forest">Your event pipeline</h3>
          <p className="m-0 text-sm text-brand-muted">
            Monitor draft, published, and completed events in one glance. Volunteers see published events instantly.
          </p>
        </header>
        {listState.status === 'error' ? (
          <p className="m-0 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{listState.error}</p>
        ) : null}
        <div className="grid gap-4 lg:[grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
          {events.map((event) => {
            const isSelected = selectedId === event.id;
            return (
              <article
                key={event.id}
                className={`flex flex-col gap-3 rounded-2xl border border-brand-forest/10 bg-white p-4 shadow-[0_12px_28px_rgba(47,133,90,0.08)] ${
                  isSelected ? 'ring-2 ring-brand-green' : ''
                }`}
              >
                <header className="flex flex-col gap-1">
                  <h4 className="m-0 text-base font-semibold text-brand-forest">{event.title}</h4>
                  <p className="m-0 text-xs text-brand-muted">{summarize(event.description)}</p>
                </header>
                <dl className="grid gap-2 text-xs text-brand-muted [grid-template-columns:repeat(auto-fit,minmax(140px,1fr))]">
                  <div>
                    <dt className="font-semibold text-brand-forest">Status</dt>
                    <dd className="m-0 uppercase tracking-wide text-brand-green">{event.status}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-brand-forest">Starts</dt>
                    <dd className="m-0">{formatDate(event.dateStart)}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-brand-forest">Signups</dt>
                    <dd className="m-0">{event.signupCount}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-brand-forest">Checked in</dt>
                    <dd className="m-0">{event.checkedInCount || 0}</dd>
                  </div>
                </dl>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="rounded-md border border-brand-forest/20 bg-brand-sand/60 px-3 py-1 text-xs font-semibold text-brand-forest"
                    onClick={() => handleSelectEvent(event.id)}
                  >
                    {isSelected ? 'Viewing' : 'View details'}
                  </button>
                  {event.status === 'DRAFT' ? (
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => handlePublish(event.id)}
                    >
                      Publish
                    </button>
                  ) : null}
                  {event.status === 'PUBLISHED' ? (
                    <button
                      type="button"
                      className="rounded-md border border-brand-forest/20 bg-white px-3 py-1 text-xs font-semibold text-brand-forest"
                      onClick={() => handleComplete(event.id)}
                    >
                      Mark completed
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })}
          {!events.length && listState.status !== 'loading' ? (
            <p className="m-0 rounded-2xl border border-dashed border-brand-forest/30 bg-white p-4 text-sm text-brand-muted">
              Your drafts will appear here. Start planning an event to invite volunteers.
            </p>
          ) : null}
        </div>
      </section>

      {selectedEvent ? (
        <section className="rounded-2xl border border-brand-forest/10 bg-white p-5 shadow-[0_18px_40px_rgba(47,133,90,0.08)]">
          <header className="flex flex-col gap-1 pb-4">
            <h3 className="m-0 text-xl font-semibold text-brand-forest">{selectedEvent.title}</h3>
            <p className="m-0 text-sm text-brand-muted">
              {selectedEvent.status === 'PUBLISHED'
                ? 'Volunteers can join this event now. Coordinate tasks and track attendance below.'
                : 'Keep refining this plan before you publish it to volunteers.'}
            </p>
          </header>

          {detailState.status === 'error' ? (
            <p className="m-0 mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {detailState.error}
            </p>
          ) : null}

          {detailState.status === 'loading' ? (
            <p className="m-0 text-sm text-brand-muted">Loading event workspace…</p>
          ) : null}

          {detail ? (
            <div className="grid gap-5 lg:[grid-template-columns:360px_1fr]">
              <aside className="flex flex-col gap-4">
                <div className="rounded-xl border border-brand-forest/10 bg-brand-sand/40 p-4">
                  <h4 className="m-0 text-sm font-semibold uppercase tracking-wide text-brand-forest">Snapshot</h4>
                  <dl className="mt-3 space-y-2 text-sm text-brand-muted">
                    <div className="flex items-center justify-between">
                      <dt className="font-medium text-brand-forest">Status</dt>
                      <dd className="m-0 uppercase text-xs font-semibold text-brand-green">{detail.event.status}</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="font-medium text-brand-forest">Capacity</dt>
                      <dd className="m-0">{detail.event.capacity}</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="font-medium text-brand-forest">Signups</dt>
                      <dd className="m-0">{detail.signups?.length || 0}</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="font-medium text-brand-forest">Checked in</dt>
                      <dd className="m-0">{checkedInCount}</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="font-medium text-brand-forest">Total volunteer minutes</dt>
                      <dd className="m-0">{totalMinutes}</dd>
                    </div>
                  </dl>
                  {detail.event.requirements ? (
                    <p className="mt-3 rounded-lg bg-white/70 p-3 text-xs text-brand-muted">
                      <span className="font-semibold text-brand-forest">Requirements:</span> {detail.event.requirements}
                    </p>
                  ) : null}
                </div>

                <div className="rounded-xl border border-brand-forest/10 bg-brand-sand/40 p-4">
                  <h4 className="m-0 text-sm font-semibold uppercase tracking-wide text-brand-forest">Assignments</h4>
                  <form className="mt-3 flex flex-col gap-3" onSubmit={handleAssign}>
                    <label className="flex flex-col gap-1 text-xs">
                      <span className="font-semibold text-brand-forest">Task</span>
                      <select
                        name="taskId"
                        className="rounded-lg border border-brand-forest/20 bg-white px-3 py-2 text-sm focus:border-brand-green focus:outline-none"
                        defaultValue=""
                        required
                      >
                        <option value="" disabled>
                          Choose a task
                        </option>
                        {assignmentOptions.map((task) => (
                          <option key={task.id} value={task.id}>
                            {task.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1 text-xs">
                      <span className="font-semibold text-brand-forest">Volunteer</span>
                      <select
                        name="userId"
                        className="rounded-lg border border-brand-forest/20 bg-white px-3 py-2 text-sm focus:border-brand-green focus:outline-none"
                        defaultValue=""
                        required
                      >
                        <option value="" disabled>
                          Choose a volunteer
                        </option>
                        {availableVolunteers.map((volunteer) => (
                          <option key={volunteer.userId} value={volunteer.userId}>
                            {volunteer.name} · {volunteer.email}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button type="submit" className="btn-primary" disabled={assignmentState.status === 'loading'}>
                      {assignmentState.status === 'loading' ? 'Assigning…' : 'Assign volunteer'}
                    </button>
                    {assignmentState.message ? (
                      <span
                        className={`text-xs font-semibold ${
                          assignmentState.status === 'error' ? 'text-red-600' : 'text-brand-green'
                        }`}
                      >
                        {assignmentState.message}
                      </span>
                    ) : null}
                  </form>
                </div>

                <div className="rounded-xl border border-brand-forest/10 bg-brand-sand/40 p-4">
                  <h4 className="m-0 text-sm font-semibold uppercase tracking-wide text-brand-forest">Impact report</h4>
                  <div className="mt-3 flex flex-col gap-2 text-xs text-brand-muted">
                    <button type="button" className="btn-primary" onClick={handleReport} disabled={reportState.status === 'loading'}>
                      {reportState.status === 'loading' ? 'Crunching numbers…' : 'Generate summary'}
                    </button>
                    {reportState.status === 'error' ? (
                      <span className="text-xs text-red-600">{reportState.error}</span>
                    ) : null}
                    {report ? (
                      <div className="rounded-lg bg-white/80 p-3 text-xs text-brand-muted">
                        <p className="m-0 font-semibold text-brand-forest">{report.event.title}</p>
                        <p className="m-0">Signups: {report.totals.totalSignups}</p>
                        <p className="m-0">Checked in: {report.totals.totalCheckedIn}</p>
                        <p className="m-0">Attendance rate: {report.totals.attendanceRate}%</p>
                        <p className="m-0">Total hours: {report.totals.totalHours}</p>
                        <a
                          className="mt-2 inline-flex items-center gap-1 text-brand-green"
                          href={`${API_BASE}/api/manager/events/${selectedId}/report?format=csv`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Download CSV
                        </a>
                      </div>
                    ) : null}
                  </div>
                </div>
              </aside>

              <div className="flex flex-col gap-5">
                <section className="rounded-xl border border-brand-forest/10 bg-brand-sand/40 p-4">
                  <header className="flex flex-col gap-1 pb-3">
                    <h4 className="m-0 text-base font-semibold text-brand-forest">Task board</h4>
                    <p className="m-0 text-xs text-brand-muted">Outline roles so volunteers know how they&apos;ll contribute.</p>
                  </header>
                  <div className="flex flex-col gap-3">
                    {taskDrafts.map((task) => (
                      <div key={task.id} className="rounded-lg bg-white/80 p-3 shadow-sm">
                        <div className="grid gap-3 sm:[grid-template-columns:repeat(2,minmax(0,1fr))]">
                          <label className="flex flex-col gap-1 text-xs">
                            <span className="font-semibold text-brand-forest">Task title</span>
                            <input
                              className="rounded-md border border-brand-forest/20 bg-white px-3 py-2 text-sm focus:border-brand-green focus:outline-none"
                              value={task.title}
                              onChange={(event) => handleTaskFieldChange(task.id, 'title', event.target.value)}
                              placeholder="Registration desk lead"
                            />
                          </label>
                          <label className="flex flex-col gap-1 text-xs">
                            <span className="font-semibold text-brand-forest">Needed volunteers</span>
                            <input
                              type="number"
                              min="1"
                              className="rounded-md border border-brand-forest/20 bg-white px-3 py-2 text-sm focus:border-brand-green focus:outline-none"
                              value={task.requiredCount}
                              onChange={(event) => handleTaskFieldChange(task.id, 'requiredCount', event.target.value)}
                            />
                          </label>
                          <label className="flex flex-col gap-1 text-xs sm:col-span-2">
                            <span className="font-semibold text-brand-forest">Description</span>
                            <textarea
                              className="min-h-[60px] rounded-md border border-brand-forest/20 bg-white px-3 py-2 text-sm focus:border-brand-green focus:outline-none"
                              value={task.description}
                              onChange={(event) => handleTaskFieldChange(task.id, 'description', event.target.value)}
                              placeholder="Outline duties, schedules, or special gear."
                            />
                          </label>
                        </div>
                        <div className="mt-2 flex justify-end">
                          <button
                            type="button"
                            className="text-xs text-red-600"
                            onClick={() => handleRemoveTask(task.id)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="rounded-md border border-brand-green bg-white px-3 py-2 text-xs font-semibold text-brand-green"
                      onClick={handleAddTask}
                    >
                      + Add task
                    </button>
                    <div className="flex items-center gap-3">
                      <button type="button" className="btn-primary" onClick={handleSaveTasks} disabled={taskState.status === 'loading'}>
                        {taskState.status === 'loading' ? 'Saving…' : 'Save tasks'}
                      </button>
                      {taskState.message ? (
                        <span
                          className={`text-xs font-semibold ${
                            taskState.status === 'error' ? 'text-red-600' : 'text-brand-green'
                          }`}
                        >
                          {taskState.message}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </section>

                <section className="rounded-xl border border-brand-forest/10 bg-brand-sand/40 p-4">
                  <header className="flex flex-col gap-1 pb-3">
                    <h4 className="m-0 text-base font-semibold text-brand-forest">Crew roster</h4>
                    <p className="m-0 text-xs text-brand-muted">See who&apos;s on each task and share quick updates.</p>
                  </header>
                  {existingAssignments.length ? (
                    <ul className="m-0 space-y-3 p-0">
                      {existingAssignments.map((assignment) => (
                        <li key={assignment.id} className="list-none rounded-lg bg-white/80 p-3 shadow-sm">
                          <p className="m-0 text-sm font-semibold text-brand-forest">{assignment.taskTitle}</p>
                          <p className="m-0 text-xs text-brand-muted">{assignment.volunteerName}</p>
                          <p className="m-0 text-xs text-brand-muted">{assignment.volunteerEmail}</p>
                          <p className="m-0 text-xs text-brand-muted">Status: {assignment.status}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="m-0 text-sm text-brand-muted">No volunteers assigned yet.</p>
                  )}
                </section>

                <section className="rounded-xl border border-brand-forest/10 bg-brand-sand/40 p-4">
                  <header className="flex flex-col gap-1 pb-3">
                    <h4 className="m-0 text-base font-semibold text-brand-forest">Attendance tracker</h4>
                    <p className="m-0 text-xs text-brand-muted">Check volunteers in as they arrive and close out their hours.</p>
                  </header>
                  {detail.signups?.length ? (
                    <div className="space-y-3">
                      {detail.signups.map((signup) => {
                        const state = attendanceState[signup.userId] || { status: 'idle' };
                        return (
                          <article key={signup.userId} className="rounded-lg bg-white/80 p-3 shadow-sm">
                            <header className="flex flex-col gap-1">
                              <h5 className="m-0 text-sm font-semibold text-brand-forest">{signup.name}</h5>
                              <p className="m-0 text-xs text-brand-muted">{signup.email}</p>
                            </header>
                            <dl className="mt-2 grid gap-2 text-xs text-brand-muted [grid-template-columns:repeat(auto-fit,minmax(140px,1fr))]">
                              <div>
                                <dt className="font-semibold text-brand-forest">Checked in</dt>
                                <dd className="m-0">{signup.checkInAt ? formatDate(signup.checkInAt) : 'Not yet'}</dd>
                              </div>
                              <div>
                                <dt className="font-semibold text-brand-forest">Checked out</dt>
                                <dd className="m-0">{signup.checkOutAt ? formatDate(signup.checkOutAt) : 'Not yet'}</dd>
                              </div>
                              <div>
                                <dt className="font-semibold text-brand-forest">Minutes</dt>
                                <dd className="m-0">{signup.minutes || 0}</dd>
                              </div>
                            </dl>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                className="rounded-md border border-brand-green bg-white px-3 py-1 text-xs font-semibold text-brand-green"
                                onClick={() => handleAttendance(signup, 'check-in')}
                                disabled={Boolean(signup.checkInAt) || state.status === 'loading'}
                              >
                                {signup.checkInAt ? 'Checked in' : state.status === 'loading' ? 'Working…' : 'Check in'}
                              </button>
                              <button
                                type="button"
                                className="btn-primary"
                                onClick={() => handleAttendance(signup, 'check-out')}
                                disabled={!signup.checkInAt || Boolean(signup.checkOutAt) || state.status === 'loading'}
                              >
                                {signup.checkOutAt ? 'Completed' : state.status === 'loading' ? 'Working…' : 'Check out'}
                              </button>
                              {state.status === 'error' ? (
                                <span className="text-xs text-red-600">{state.message}</span>
                              ) : null}
                              {state.status === 'success' ? (
                                <span className="text-xs font-semibold text-brand-green">
                                  {state.action === 'check-out' ? 'Hours logged' : 'Checked in!'}
                                </span>
                              ) : null}
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="m-0 text-sm text-brand-muted">No volunteer signups yet.</p>
                  )}
                </section>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
