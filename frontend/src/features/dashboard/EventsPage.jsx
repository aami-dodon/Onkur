import { useEffect, useMemo, useState } from 'react';

import useDocumentTitle from '../../lib/useDocumentTitle';
import { useAuth } from '../auth/AuthContext';
import EventDiscovery from '../volunteer/EventDiscovery';
import { fetchEvents, signupForEvent } from '../volunteer/api';
import DashboardCard from './DashboardCard';
import { determinePrimaryRole } from './roleUtils';

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

  const firstName = useMemo(() => user?.name?.split(' ')[0] || 'friend', [user?.name]);
  const activeRole = useMemo(
    () => determinePrimaryRole(roles, role),
    [roles, role]
  );
  const intro = useMemo(
    () => buildIntro(activeRole, firstName),
    [activeRole, firstName]
  );

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

  const isLoading = status.phase === 'loading';

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h2 className="m-0 font-display text-2xl font-semibold text-brand-forest">{intro.title}</h2>
        <p className="m-0 text-sm text-brand-muted sm:text-base">{intro.description}</p>
      </header>
      {status.phase === 'error' ? (
        <p className="m-0 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{status.message}</p>
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
          onSignup={handleSignup}
        />
      </DashboardCard>
    </div>
  );
}
