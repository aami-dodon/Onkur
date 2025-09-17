import DashboardCard from './DashboardCard';
import { useAuth } from '../auth/AuthContext';

export default function SponsorDashboard() {
  const { user } = useAuth();

  return (
    <div className="dashboard-grid">
      <header className="dashboard-header">
        <h2>Thank you, {user?.name?.split(' ')[0] || 'sponsor'} 🌍</h2>
        <p>Track the visibility of your contributions and stay close to the stories your support makes possible.</p>
      </header>
      <DashboardCard
        title="Active sponsorships"
        description="A summary of the events and initiatives you are fueling will appear here soon."
      >
        <span className="status-pill">💚 Impact reporting under construction</span>
      </DashboardCard>
      <DashboardCard
        title="Recognition toolkit"
        description="Logos, shout-outs, and gallery spotlights will be coordinated through this workspace."
      >
        <p style={{ margin: 0 }}>Set preferred visibility guidelines once the toolkit unlocks.</p>
      </DashboardCard>
      <DashboardCard
        title="Impact reports"
        description="Download snapshots of volunteer hours, stories, and carbon savings tied to your sponsorship."
      >
        <p style={{ margin: 0 }}>Analytics pipelines are being seeded for upcoming phases.</p>
      </DashboardCard>
    </div>
  );
}
