import { Suspense, lazy, useMemo } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { useAuth } from '../auth/AuthContext';
import LoadingScreen from '../layout/LoadingScreen';

const AdminDashboard = lazy(() => import('./AdminDashboard'));
const EventManagerDashboard = lazy(() => import('./EventManagerDashboard'));
const EventsPage = lazy(() => import('./EventsPage'));
const GalleryPage = lazy(() => import('./GalleryPage'));
const ProfilePage = lazy(() => import('./ProfilePage'));
const SponsorDashboard = lazy(() => import('./SponsorDashboard'));
const VolunteerDashboard = lazy(() => import('./VolunteerDashboard'));
import { determinePrimaryRole, normalizeRoles } from './roleUtils';

const HOME_COMPONENTS = {
  ADMIN: AdminDashboard,
  EVENT_MANAGER: EventManagerDashboard,
  SPONSOR: SponsorDashboard,
};

function resolveHome(role) {
  if (role && HOME_COMPONENTS[role]) {
    return HOME_COMPONENTS[role];
  }
  return VolunteerDashboard;
}

export default function DashboardRouter() {
  const { user } = useAuth();

  const normalizedRoles = useMemo(
    () => normalizeRoles(user?.roles ?? [], user?.role ?? null),
    [user?.roles, user?.role]
  );

  const primaryRole = useMemo(
    () => determinePrimaryRole(normalizedRoles, user?.role ?? null),
    [normalizedRoles, user?.role]
  );

  if (!user) {
    return null;
  }

  const HomeComponent = resolveHome(primaryRole);

  return (
    <Suspense fallback={<LoadingScreen label="Loading your dashboard" />}>
      <Routes>
        <Route index element={<HomeComponent />} />
        <Route path="events" element={<EventsPage role={primaryRole} roles={normalizedRoles} />} />
        <Route
          path="gallery"
          element={<GalleryPage role={primaryRole} roles={normalizedRoles} />}
        />
        <Route
          path="profile"
          element={<ProfilePage role={primaryRole} roles={normalizedRoles} />}
        />
        <Route path="*" element={<Navigate to="." replace />} />
      </Routes>
    </Suspense>
  );
}
