import { useEffect, useMemo, useState } from 'react';
import DashboardCard from './DashboardCard';
import { useAuth } from '../auth/AuthContext';
import useDocumentTitle from '../../lib/useDocumentTitle';
import HoursTracker from '../volunteer/HoursTracker';
import {
  fetchVolunteerDashboard,
  fetchVolunteerHours,
  fetchMySignups,
  logVolunteerHours,
  leaveEvent as leaveEventRequest,
} from '../volunteer/api';
import { fetchImpactAnalytics } from '../impact/impactApi';
import ProfileCompletionCallout from './ProfileCompletionCallout';
import calculateProfileProgress from './profileProgress';

function formatShortDate(value) {
  if (!value) return '';
  const date = new Date(value);
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function formatNumber(value, { maximumFractionDigits = 1 } = {}) {
  return Number(value || 0).toLocaleString('en-US', { maximumFractionDigits });
}

export default function VolunteerDashboard() {
  const { user, token } = useAuth();
  const firstName = user?.name?.split(' ')[0] || 'volunteer';
  useDocumentTitle(`Onkur | Hi ${firstName} 👋`);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [hoursSummary, setHoursSummary] = useState(null);
  const [signups, setSignups] = useState([]);
  const [leaveStatus, setLeaveStatus] = useState({});
  const [leaveFeedback, setLeaveFeedback] = useState(null);
  const [impactOverview, setImpactOverview] = useState(null);
  const [impactState, setImpactState] = useState({ status: 'idle', error: '' });

  const profileProgress = useMemo(
    () => calculateProfileProgress(dashboard?.profile),
    [dashboard]
  );

  const totalBadgesEarned = useMemo(() => {
    if (!hoursSummary?.badges) return 0;
    return hoursSummary.badges.filter((badge) => badge.earned).length;
  }, [hoursSummary]);

  useEffect(() => {
    if (!token) return;
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        await Promise.all([
          refreshDashboard(token, active),
          refreshHours(token, active),
          refreshSignups(token, active),
          refreshImpact(token, active),
        ]);
      } catch (err) {
        if (active) {
          setError(err.message || 'Unable to load your volunteer journey.');
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
  }, [token]);

  async function refreshDashboard(activeToken = token, active = true) {
    const data = await fetchVolunteerDashboard(activeToken);
    if (!active) return;
    setDashboard(data);
  }

  async function refreshHours(activeToken = token, active = true) {
    const data = await fetchVolunteerHours(activeToken);
    if (!active) return;
    setHoursSummary(data);
  }

  async function refreshSignups(activeToken = token, active = true) {
    const data = await fetchMySignups(activeToken);
    if (!active) return;
    setSignups(Array.isArray(data.signups) ? data.signups : []);
  }

  async function refreshImpact(activeToken = token, active = true) {
    if (!active) return;
    setImpactState({ status: 'loading', error: '' });
    try {
      const response = await fetchImpactAnalytics({ token: activeToken });
      if (!active) return;
      setImpactOverview(response.overview || null);
      setImpactState({ status: 'success', error: '' });
    } catch (err) {
      if (!active) return;
      setImpactState({ status: 'error', error: err.message || 'Unable to load community impact metrics.' });
    }
  }

  const handleLogHours = async ({ eventId, minutes, note }) => {
    const response = await logVolunteerHours(token, eventId, { minutes, note });
    await Promise.all([refreshHours(token), refreshDashboard(token)]);
    return response.entry;
  };

  const handleLeaveEvent = async (eventId) => {
    if (!eventId) return;
    setLeaveStatus((prev) => ({ ...prev, [eventId]: 'loading' }));
    setLeaveFeedback(null);
    try {
      await leaveEventRequest(token, eventId);
      setLeaveStatus((prev) => ({ ...prev, [eventId]: 'success' }));
      setLeaveFeedback({ type: 'success', message: 'You left the event. We\u2019ll keep your calendar clear.' });
      await Promise.all([refreshDashboard(token), refreshSignups(token), refreshHours(token), refreshImpact(token)]);
    } catch (error) {
      setLeaveStatus((prev) => ({ ...prev, [eventId]: 'error' }));
      setLeaveFeedback({ type: 'error', message: error.message || 'Unable to leave this event.' });
    }
  };

  const upcomingEvents = dashboard?.upcomingEvents || [];
  const pastEvents = dashboard?.pastEvents || [];
  const hoursLogged = hoursSummary?.totalHours ? Math.round(hoursSummary.totalHours * 10) / 10 : 0;
  const retentionDelta = impactOverview?.volunteerEngagement?.retentionDelta ?? 0;
  const retentionLabel = Number.isFinite(retentionDelta)
    ? `${retentionDelta >= 0 ? '+' : ''}${(retentionDelta * 100).toFixed(1)}%`
    : '—';

  return (
    <div className="grid gap-5 md:[grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
      <header className="flex flex-col gap-2 md:col-span-full">
        <h2 className="m-0 font-display text-2xl font-semibold text-brand-forest">Hi {firstName} 👋</h2>
        <p className="m-0 text-sm text-brand-muted sm:text-base">
          {loading
            ? 'Loading your volunteer journey…'
            : `You have logged ${hoursLogged} hours and earned ${totalBadgesEarned} eco badge${
                totalBadgesEarned === 1 ? '' : 's'
              }. Keep growing your impact!`}
        </p>
      </header>
      {!loading && !error ? (
        <ProfileCompletionCallout
          progress={profileProgress}
          className="md:col-span-full"
          title="Complete your profile to unlock tailored invites"
          description="Finishing your profile helps event managers match you with roles faster and gives check-in teams the context they need to support you on site."
        />
      ) : null}
      {error ? (
        <p className="md:col-span-full rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      <DashboardCard
        className="md:col-span-full"
        title="Upcoming commitments"
        description={
          upcomingEvents.length
            ? 'Here’s what you have coming up next. Add them to your calendar and watch for reminder emails.'
            : 'You are not signed up for any events yet. Check back soon for new opportunities or visit the events hub to explore more ways to help.'
        }
      >
        {upcomingEvents.length ? (
          <ul className="m-0 list-none space-y-3 p-0">
            {upcomingEvents.map((event) => (
              <li
                key={event.id}
                className="rounded-2xl border border-brand-forest/10 bg-brand-sand/60 px-3 py-2 text-sm text-brand-muted"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="m-0 font-semibold text-brand-forest">{event.title}</p>
                    <p className="m-0">{formatShortDate(event.dateStart)}</p>
                    <p className="m-0 text-xs text-brand-muted">{event.location}</p>
                  </div>
                  <button
                    type="button"
                    className="rounded-md border border-brand-forest/20 bg-white px-3 py-2 text-xs font-semibold text-brand-forest shadow-sm disabled:opacity-60"
                    onClick={() => handleLeaveEvent(event.id)}
                    disabled={leaveStatus[event.id] === 'loading'}
                  >
                    {leaveStatus[event.id] === 'loading' ? 'Leaving…' : 'Leave event'}
                  </button>
                </div>
                {leaveStatus[event.id] === 'error' ? (
                  <p className="mt-2 text-xs text-red-600">We couldn’t update this signup. Try again.</p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="m-0 text-sm text-brand-muted">No upcoming events scheduled.</p>
        )}
        {leaveFeedback ? (
          <p
            className={`mt-3 text-xs ${leaveFeedback.type === 'success' ? 'text-brand-green' : 'text-red-600'}`}
          >
            {leaveFeedback.message}
          </p>
        ) : null}
        {pastEvents.length ? (
          <div className="mt-4 space-y-2">
            <h5 className="m-0 text-xs font-semibold uppercase tracking-[0.14em] text-brand-muted">Recently completed</h5>
            <ul className="m-0 list-none space-y-2 p-0 text-xs text-brand-muted">
              {pastEvents.slice(0, 3).map((event) => (
                <li key={event.id} className="rounded-xl border border-brand-forest/10 bg-white px-3 py-2">
                  <span className="font-semibold text-brand-forest">{event.title}</span>
                  <span className="block">{formatShortDate(event.dateEnd)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </DashboardCard>
      <DashboardCard
        className="md:col-span-full"
        title="Impact tracker"
        description="Log time, watch your eco badges bloom, and celebrate your wins."
      >
        <HoursTracker summary={hoursSummary} signups={signups} onLogHours={handleLogHours} />
      </DashboardCard>

      <DashboardCard
        className="md:col-span-full"
        title="Community impact highlights"
        description="See how everyone’s efforts are showing up across Onkur."
      >
        {impactState.status === 'loading' && !impactOverview ? (
          <p className="m-0 text-sm text-brand-muted">Measuring collective impact…</p>
        ) : null}
        {impactState.status === 'error' ? (
          <p className="m-0 text-sm font-medium text-red-600">{impactState.error}</p>
        ) : null}
        {impactOverview ? (
          <ul className="m-0 list-none space-y-2 p-0 text-sm text-brand-muted">
            <li>
              <strong className="text-brand-forest">{formatNumber(impactOverview.volunteerEngagement?.totalHours || 0)}</strong>{' '}
              volunteer hours recorded across the community.
            </li>
            <li>
              {formatNumber(impactOverview.stories?.approved ?? 0, { maximumFractionDigits: 0 })} stories approved this season and{' '}
              {formatNumber(impactOverview.eventParticipation?.eventsSupported ?? 0, { maximumFractionDigits: 0 })} events supported by volunteers.
            </li>
            <li>
              Galleries reached {formatNumber(impactOverview.galleryEngagement?.totalViews || 0, { maximumFractionDigits: 0 })} views
              and spotlighted sponsors {formatNumber(impactOverview.sponsorImpact?.sponsorMentions || 0, {
                maximumFractionDigits: 0,
              })}{' '}
              times.
            </li>
            <li>
              Volunteer retention trend vs last quarter: <span className="font-semibold text-brand-forest">{retentionLabel}</span>
            </li>
          </ul>
        ) : null}
      </DashboardCard>
    </div>
  );
}
