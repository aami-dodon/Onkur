import DashboardCard from './DashboardCard';
import { useAuth } from '../auth/AuthContext';

export default function EventManagerDashboard() {
  const { user } = useAuth();

  return (
    <div className="dashboard-grid">
      <header className="dashboard-header">
        <h2>Welcome back, {user?.name?.split(' ')[0] || 'manager'} 🌱</h2>
        <p>Plan meaningful experiences, assign volunteer crews, and showcase impact with visual storytelling.</p>
      </header>
      <DashboardCard
        title="Event pipeline"
        description="Proposals, approvals, and execution timelines live here. The workflow module arrives in Phase 2."
      >
        <span className="status-pill">🚧 Drafting tools on the way</span>
      </DashboardCard>
      <DashboardCard
        title="Volunteer coordination"
        description="Build task boards, shift schedules, and attendance trackers to keep every event humming."
      >
        <p style={{ margin: 0 }}>Invite volunteers and assign micro-missions once the coordination suite launches.</p>
      </DashboardCard>
      <DashboardCard
        title="Gallery management"
        description="Curate post-event photos with captions, highlight beneficiary quotes, and celebrate eco-wins."
      >
        <p style={{ margin: 0 }}>Upload queues and moderation tools will land in Phase 2.</p>
      </DashboardCard>
    </div>
  );
}
