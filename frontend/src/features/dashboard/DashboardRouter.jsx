import { Navigate, Route, Routes } from 'react-router-dom';

import { useAuth } from '../auth/AuthContext';
import AdminDashboard from './AdminDashboard';
import EventManagerDashboard from './EventManagerDashboard';
import EventsPage from './EventsPage';
import GalleryPage from './GalleryPage';
import ProfilePage from './ProfilePage';
import SponsorDashboard from './SponsorDashboard';
import VolunteerDashboard from './VolunteerDashboard';

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

  const HomeComponent = resolveHome(user.role);

  return (
    <Routes>
      <Route index element={<HomeComponent />} />
      <Route path="events" element={<EventsPage role={user.role} />} />
      <Route path="gallery" element={<GalleryPage role={user.role} />} />
      <Route path="profile" element={<ProfilePage role={user.role} />} />
      <Route path="*" element={<Navigate to="." replace />} />
    </Routes>
  );
}
