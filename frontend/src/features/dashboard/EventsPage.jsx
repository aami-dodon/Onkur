import { useEffect, useMemo, useState } from 'react';

import useDocumentTitle from '../../lib/useDocumentTitle';
import { useAuth } from '../auth/AuthContext';
import EventDiscovery from '../volunteer/EventDiscovery';
import { fetchEvents, signupForEvent, leaveEvent } from '../volunteer/api';
import DashboardCard from './DashboardCard';
import { determinePrimaryRole } from './roleUtils';
import SponsorSupportForm from '../sponsors/SponsorSupportForm';
import { pledgeEventSponsorship } from '../sponsors/api';

const DEFAULT_FILTERS = { category: '', location: '', theme: '', date: '' };

function buildIntro(role, firstName) {
  switch (role) {
    case 'EVENT_MANAGER':
      return {
        title: `Plan your next experience, ${firstName}`,
        description:
          'Monitor live opportunities, confirm details, and ensure volunteers can find the right fit. Use the filters to audit what is published.',
      };
    case 'SPONSOR':
      return {
        title: `Spotlight upcoming collaborations, ${firstName}`,
        description:
          'Review the experiences you support and get a quick snapshot of what is open for the community right now.',
      };
    case 'ADMIN':
      return {
        title: `Track events across Onkur, ${firstName}`,
        description:
          'Keep a pulse on the opportunities that are currently collecting volunteers so you can coordinate support if needed.',
      };
    default:
      return {
        title: `Find your next event, ${firstName}`,
        description:
          'Filter by category, location, theme, or date to discover opportunities that match your energy and availability.',
      };
  }
}

export default function EventsPage({ role, roles = [] }) {
  const { token, user } = useAuth();
  const [events, setEvents] = useState([]);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [status, setStatus] = useState({ phase: 'loading', message: '' });
  const [supportingEvent, setSupportingEvent] = useState(null);
  const [supportStatus, setSupportStatus] = useState({ state: 'idle', message: '' });

  const firstName = useMemo(() => user?.name?.split(' ')[0] || 'friend', [user?.name]);
  const activeRole = useMemo(
    () => determinePrimaryRole(roles, role),
    [roles, role]
  );
  const intro = useMemo(
    () => buildIntro(activeRole, firstName),
    [activeRole, firstName]
  );

  const sponsorProfile = user?.sponsorProfile || null;
  const sponsorApproved = sponsorProfile?.status === 'APPROVED';

  useDocumentTitle('Onkur | Events');

  useEffect(() => {
    if (!token) return undefined;
    let active = true;

    setStatus({ phase: 'loading', message: '' });

    (async () => {
      try {
        const response = await fetchEvents(token, filters);
        if (!active) return;
        setEvents(Array.isArray(response?.events) ? response.events : []);
        setStatus({ phase: 'ready', message: '' });
      } catch (error) {
        if (!active) return;
        setStatus({ phase: 'error', message: error.message || 'Unable to load events right now.' });
      }
    })();

    return () => {
      active = false;
    };
  }, [token, filters]);

  const handleFilterChange = (nextFilters) => {
    setFilters({ ...DEFAULT_FILTERS, ...nextFilters });
  };

  const handleSignup = async (eventId) => {
    if (!token) {
      throw new Error('You need to be signed in to join an event.');
    }
    const result = await signupForEvent(token, eventId);
    setFilters((previous) => ({ ...previous }));
    return result;
  };

  const handleLeave = async (eventId) => {
    if (!token) {
      throw new Error('You need to be signed in to manage your event signups.');
    }
    const result = await leaveEvent(token, eventId);
    setFilters((previous) => ({ ...previous }));
    return result;
  };

  const handleSupport = (event) => {
    setSupportStatus({ state: 'idle', message: '' });
    setSupportingEvent(event);
  };

  const handleSupportSubmit = async ({ type, amount, notes }) => {
    if (!token || !supportingEvent) {
      throw new Error('Authentication required');
    }
    setSupportStatus({ state: 'loading', message: '' });
    try {
      await pledgeEventSponsorship(token, supportingEvent.id, { type, amount, notes });
      setSupportStatus({ state: 'success', message: 'Sponsorship saved.' });
      setSupportingEvent(null);
      setFilters((previous) => ({ ...previous }));
    } catch (error) {
      setSupportStatus({ state: 'error', message: error.message || 'Unable to save sponsorship.' });
      throw error;
    }
  };

  const closeSupportForm = () => {
    setSupportingEvent(null);
    setSupportStatus({ state: 'idle', message: '' });
  };

  const isLoading = status.phase === 'loading';
  const isSponsorMode = activeRole === 'SPONSOR';

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h2 className="m-0 font-display text-2xl font-semibold text-brand-forest">{intro.title}</h2>
        <p className="m-0 text-sm text-brand-muted sm:text-base">{intro.description}</p>
      </header>
      {status.phase === 'error' ? (
        <p className="m-0 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{status.message}</p>
      ) : null}
      {isSponsorMode && !sponsorApproved ? (
        <p className="m-0 rounded-2xl border border-brand-forest/20 bg-brand-sand/50 p-4 text-sm text-brand-muted">
          Submit or update your sponsor profile to start pledging support for events. Admin approval is required before your
          logo appears on event pages.
        </p>
      ) : null}
      <DashboardCard
        title="Opportunities open now"
        description="Search the community calendar and jump into the experiences that excite you."
        className="md:col-span-full"
      >
        <EventDiscovery
          events={events}
          filters={filters}
          isLoading={isLoading}
          onFilterChange={handleFilterChange}
          onSignup={isSponsorMode ? undefined : handleSignup}
          onLeave={isSponsorMode ? undefined : handleLeave}
          mode={isSponsorMode ? 'sponsor' : 'volunteer'}
          sponsorOptions={
            isSponsorMode && sponsorApproved
              ? {
                  onSupport: handleSupport,
                }
              : null
          }
        />
      </DashboardCard>
      {supportingEvent ? (
        <SponsorSupportForm
          event={supportingEvent}
          initialSponsorship={supportingEvent.mySponsorship}
          isSubmitting={supportStatus.state === 'loading'}
          onSubmit={async (payload) => {
            await handleSupportSubmit(payload);
          }}
          onCancel={closeSupportForm}
        />
      ) : null}
      {supportStatus.state === 'error' ? (
        <p className="m-0 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{supportStatus.message}</p>
      ) : null}
      {supportStatus.state === 'success' ? (
        <p className="m-0 rounded-2xl border border-brand-green/20 bg-brand-sand/70 p-3 text-sm text-brand-forest">
          {supportStatus.message}
        </p>
      ) : null}
    </div>
  );
}
