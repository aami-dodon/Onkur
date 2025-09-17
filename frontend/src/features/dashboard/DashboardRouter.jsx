import { useAuth } from '../auth/AuthContext';
import AdminDashboard from './AdminDashboard';
import EventManagerDashboard from './EventManagerDashboard';
import SponsorDashboard from './SponsorDashboard';
import VolunteerDashboard from './VolunteerDashboard';

export default function DashboardRouter() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  switch (user.role) {
    case 'ADMIN':
      return <AdminDashboard />;
    case 'EVENT_MANAGER':
      return <EventManagerDashboard />;
    case 'SPONSOR':
      return <SponsorDashboard />;
    default:
      return <VolunteerDashboard />;
  }
}
