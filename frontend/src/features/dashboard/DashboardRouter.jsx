import { useMemo } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { useAuth } from '../auth/AuthContext';
import AdminDashboard from './AdminDashboard';
import EventManagerDashboard from './EventManagerDashboard';
import EventsPage from './EventsPage';
import GalleryPage from './GalleryPage';
import ProfilePage from './ProfilePage';
import SponsorDashboard from './SponsorDashboard';
import VolunteerDashboard from './VolunteerDashboard';
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

  if (!user) {
    return null;
  }

  const normalizedRoles = useMemo(
    () => normalizeRoles(user.roles, user.role),
    [user.roles, user.role]
  );

  const primaryRole = useMemo(
    () => determinePrimaryRole(normalizedRoles, user.role),
    [normalizedRoles, user.role]
  );

  const HomeComponent = resolveHome(primaryRole);

  return (
    <Routes>
      <Route index element={<HomeComponent />} />
      <Route
        path="events"
        element={<EventsPage role={primaryRole} roles={normalizedRoles} />}
      />
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
  );
}
