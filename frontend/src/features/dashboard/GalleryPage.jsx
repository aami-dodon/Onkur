import { useCallback, useEffect, useMemo, useState } from 'react';

import { apiRequest } from '../../lib/apiClient';
import useDocumentTitle from '../../lib/useDocumentTitle';
import { useAuth } from '../auth/AuthContext';
import MediaUploadForm from '../event-gallery/MediaUploadForm';
import EventGalleryViewer from '../event-gallery/EventGalleryViewer';
import ModerationQueue from '../event-gallery/ModerationQueue';
import { fetchGalleryEvents } from '../event-gallery/galleryApi';
import ImpactStoryComposer from '../impact/ImpactStoryComposer';
import DashboardCard from './DashboardCard';
import { determinePrimaryRole, normalizeRoles } from './roleUtils';

function buildIntro(role, firstName) {
  switch (role) {
    case 'EVENT_MANAGER':
      return {
        title: `Curate your event stories, ${firstName}`,
        description:
          'Upload photos, tag volunteers and sponsors, and keep your impact gallery fresh so teams can relive the day.',
      };
    case 'SPONSOR':
      return {
        title: `Celebrate the partnerships you power, ${firstName}`,
        description:
          'Review highlight reels from supported events and gather assets for your next board update.',
      };
    case 'ADMIN':
      return {
        title: `Moderate and elevate Onkur stories, ${firstName}`,
        description:
          'Approve new uploads, reject anything off-brand, and spotlight the best galleries for the public hub.',
      };
    default:
      return {
        title: `Revisit the moments you created, ${firstName}`,
        description:
          'Explore galleries from recent events, download your favourite memories, and share them with your crew.',
      };
  }
}

function uniqEvents(events) {
  const map = new Map();
  events.forEach((event) => {
    if (!event || !event.id) return;
    if (!map.has(event.id)) {
      map.set(event.id, {
        id: event.id,
        title: event.title,
      });
    }
  });
  return Array.from(map.values());
}

export default function GalleryPage({ role, roles = [] }) {
  const { user, token } = useAuth();
  const firstName = useMemo(() => user?.name?.split(' ')[0] || 'friend', [user?.name]);
  const normalizedRoles = useMemo(() => normalizeRoles(roles, role), [roles, role]);
  const activeRole = useMemo(
    () => determinePrimaryRole(normalizedRoles, role),
    [normalizedRoles, role]
  );
  const intro = useMemo(() => buildIntro(activeRole, firstName), [activeRole, firstName]);

  const [uploadableEvents, setUploadableEvents] = useState([]);
  const [uploadStatus, setUploadStatus] = useState({ state: 'idle', message: '' });
  const [galleryEvents, setGalleryEvents] = useState([]);
  const [galleryStatus, setGalleryStatus] = useState({ state: 'idle', message: '' });
  const [selectedEventId, setSelectedEventId] = useState('');
  const [refreshSignal, setRefreshSignal] = useState(0);
  const [storyCount, setStoryCount] = useState(0);

  useDocumentTitle('Onkur | Gallery');

  const canUpload = useMemo(
    () => normalizedRoles.includes('VOLUNTEER') || normalizedRoles.includes('EVENT_MANAGER'),
    [normalizedRoles]
  );

  const canSubmitStory = useMemo(
    () =>
      normalizedRoles.some((roleName) =>
        ['VOLUNTEER', 'EVENT_MANAGER', 'SPONSOR', 'ADMIN'].includes(roleName)
      ),
    [normalizedRoles]
  );

  useEffect(() => {
    if (!token) {
      setUploadableEvents([]);
      return;
    }
    let isMounted = true;
    (async () => {
      setUploadStatus({ state: 'loading', message: '' });
      try {
        const requests = [];
        if (normalizedRoles.includes('VOLUNTEER')) {
          requests.push(
            apiRequest('/api/me/signups', { token }).then((response) =>
              (response.signups || []).map((signup) => ({
                id: signup.event_id || signup.eventId,
                title: signup.title,
              }))
            )
          );
        }
        if (normalizedRoles.includes('EVENT_MANAGER') || normalizedRoles.includes('ADMIN')) {
          requests.push(
            apiRequest('/api/manager/events', { token }).then((response) =>
              (response.events || []).map((event) => ({ id: event.id, title: event.title }))
            )
          );
        }
        const resolved = await Promise.all(requests);
        if (!isMounted) return;
        const merged = uniqEvents(resolved.flat());
        setUploadableEvents(merged);
        setUploadStatus({ state: 'success', message: '' });
        setSelectedEventId((current) => current || (merged[0] ? merged[0].id : ''));
      } catch (error) {
        if (!isMounted) return;
        setUploadStatus({ state: 'error', message: error.message || 'Unable to load your events' });
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [normalizedRoles, token]);

  const loadGalleryEvents = useCallback(async () => {
    setGalleryStatus({ state: 'loading', message: '' });
    try {
      const response = await fetchGalleryEvents({ pageSize: 24 });
      const events = response.events || [];
      setGalleryEvents(events);
      setGalleryStatus({ state: 'success', message: '' });
      setSelectedEventId((current) => current || (events[0] ? events[0].id : ''));
    } catch (error) {
      setGalleryStatus({ state: 'error', message: error.message || 'Unable to load galleries' });
    }
  }, []);

  useEffect(() => {
    loadGalleryEvents();
  }, [loadGalleryEvents]);

  const handleUploaded = useCallback(
    (media) => {
      if (media?.eventId) {
        setSelectedEventId(media.eventId);
        setRefreshSignal((value) => value + 1);
      }
      loadGalleryEvents();
    },
    [loadGalleryEvents]
  );

  const handleStorySubmitted = useCallback(() => {
    setRefreshSignal((value) => value + 1);
  }, [setRefreshSignal]);

  const handleStoriesLoaded = useCallback((stories = []) => {
    setStoryCount(Array.isArray(stories) ? stories.length : 0);
  }, []);

  const viewerEvents = useMemo(
    () => galleryEvents.filter((event) => event && event.id),
    [galleryEvents]
  );
  const isAdmin = normalizedRoles.includes('ADMIN');

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h2 className="m-0 font-display text-2xl font-semibold text-brand-forest">{intro.title}</h2>
        <p className="m-0 text-sm text-brand-muted sm:text-base">{intro.description}</p>
      </header>

      {canUpload ? (
        <MediaUploadForm token={token} events={uploadableEvents} onUploaded={handleUploaded} />
      ) : null}

      {canSubmitStory && selectedEventId ? (
        <div className="flex flex-col gap-2">
          <ImpactStoryComposer
            eventId={selectedEventId}
            token={token}
            onSubmitted={handleStorySubmitted}
          />
          <p className="m-0 text-xs text-brand-muted">
            {storyCount
              ? `${storyCount} approved impact stor${storyCount === 1 ? 'y' : 'ies'} featured for this event.`
              : 'No approved impact stories yet—yours could be the first!'}
          </p>
        </div>
      ) : null}

      <DashboardCard
        title="Gallery explorer"
        description="Pick an event to view its approved media. Scroll to load more moments and open photos for a closer look."
        className="md:col-span-full"
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {viewerEvents.map((event) => (
              <button
                key={event.id}
                type="button"
                onClick={() => setSelectedEventId(event.id)}
                className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                  selectedEventId === event.id
                    ? 'bg-brand-forest text-white shadow-lg'
                    : 'bg-brand-sand text-brand-forest hover:bg-brand-sand/80'
                }`}
              >
                {event.title}
              </button>
            ))}
          </div>
          {galleryStatus.state === 'error' ? (
            <p className="text-sm text-red-600">{galleryStatus.message}</p>
          ) : null}
          <EventGalleryViewer
            eventId={selectedEventId}
            token={token}
            refreshSignal={refreshSignal}
            onStoriesLoaded={handleStoriesLoaded}
          />
        </div>
      </DashboardCard>

      {isAdmin ? <ModerationQueue token={token} /> : null}

      {uploadStatus.state === 'error' ? (
        <p className="text-sm text-red-600">{uploadStatus.message}</p>
      ) : null}
    </div>
  );
}
