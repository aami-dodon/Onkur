import DashboardCard from './DashboardCard';
import { useAuth } from '../auth/AuthContext';

export default function VolunteerDashboard() {
  const { user } = useAuth();

  return (
    <div className="dashboard-grid">
      <header className="dashboard-header">
        <h2>Hi {user?.name?.split(' ')[0] || 'volunteer'} 👋</h2>
        <p>
          Your dashboard keeps track of upcoming events, logged hours, and the eco-badges you earn while supporting
          community action.
        </p>
      </header>
      <DashboardCard
        title="Upcoming commitments"
        description="You do not have any events scheduled yet. Explore opportunities once the event hub launches."
      >
        <span className="status-pill">📅 Events opening soon</span>
      </DashboardCard>
      <DashboardCard
        title="Impact tracker"
        description="Log volunteer hours to grow your seedling into a flourishing forest. Metrics arrive in Phase 2."
      >
        <p style={{ margin: 0 }}>
          Hours logged: <strong>0</strong>
        </p>
        <p style={{ margin: 0 }}>Eco-badges unlocked: <strong>Seedling</strong></p>
      </DashboardCard>
      <DashboardCard
        title="Stories & galleries"
        description="Share photos and reflections from the ground. Galleries unlock once events start rolling in."
      >
        <p style={{ margin: 0 }}>Keep an eye out for featured community stories curated by our event teams.</p>
      </DashboardCard>
    </div>
  );
}
