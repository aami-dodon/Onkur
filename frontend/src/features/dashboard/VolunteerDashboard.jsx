import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardCard from './DashboardCard';
import { useAuth } from '../auth/AuthContext';
import useDocumentTitle from '../../lib/useDocumentTitle';
import HoursTracker from '../volunteer/HoursTracker';
import {
  fetchVolunteerDashboard,
  fetchVolunteerHours,
  fetchMySignups,
  logVolunteerHours,
} from '../volunteer/api';

function formatShortDate(value) {
  if (!value) return '';
  const date = new Date(value);
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
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

  const profileProgress = useMemo(() => {
    if (!dashboard?.profile) {
      return null;
    }

    const { profile } = dashboard;
    const requirements = [
      {
        label: 'Add at least one skill',
        complete: Array.isArray(profile.skills) && profile.skills.length > 0,
      },
      {
        label: 'Share the causes you care about',
        complete: Array.isArray(profile.interests) && profile.interests.length > 0,
      },
      {
        label: 'Set your availability',
        complete: Boolean(profile.availability && profile.availability.trim().length),
      },
      {
        label: 'Add your home base or region',
        complete: Boolean(profile.location && profile.location.trim().length),
      },
      {
        label: 'Introduce yourself with a short bio',
        complete: Boolean(profile.bio && profile.bio.trim().length),
      },
    ];

    const completed = requirements.filter((item) => item.complete).length;
    const percentage = Math.round((completed / requirements.length) * 100);
    const missing = requirements.filter((item) => !item.complete).map((item) => item.label);

    return {
      percentage,
      missing,
      isComplete: completed === requirements.length,
    };
  }, [dashboard]);

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
        await Promise.all([refreshDashboard(token, active), refreshHours(token, active), refreshSignups(token, active)]);
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

  const handleLogHours = async ({ eventId, minutes, note }) => {
    const response = await logVolunteerHours(token, eventId, { minutes, note });
    await Promise.all([refreshHours(token), refreshDashboard(token)]);
    return response.entry;
  };

  const upcomingEvents = dashboard?.upcomingEvents || [];
  const pastEvents = dashboard?.pastEvents || [];
  const hoursLogged = hoursSummary?.totalHours ? Math.round(hoursSummary.totalHours * 10) / 10 : 0;

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
      {!loading && !error && profileProgress && !profileProgress.isComplete ? (
        <section className="md:col-span-full rounded-3xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2 sm:max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-amber-600">
                <span>{profileProgress.percentage}% complete</span>
              </div>
              <h3 className="m-0 font-display text-xl font-semibold text-brand-forest">Complete your profile to unlock tailored invites</h3>
              <p className="m-0 text-sm text-brand-muted">
                Finishing your profile helps event managers match you with roles faster and gives check-in teams the context they need to support you on site.
              </p>
              {profileProgress.missing.length ? (
                <ul className="m-0 list-disc space-y-1 pl-5 text-sm text-amber-700">
                  {profileProgress.missing.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center">
              <Link className="btn-primary" to="/app/profile">
                Update my profile
              </Link>
            </div>
          </div>
        </section>
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
                <p className="m-0 font-semibold text-brand-forest">{event.title}</p>
                <p className="m-0">{formatShortDate(event.dateStart)}</p>
                <p className="m-0 text-xs text-brand-muted">{event.location}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="m-0 text-sm text-brand-muted">No upcoming events scheduled.</p>
        )}
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
    </div>
  );
}
