import DashboardCard from './DashboardCard';
import { useAuth } from '../auth/AuthContext';

export default function EventManagerDashboard() {
  const { user } = useAuth();

  return (
    <div className="grid gap-5 md:[grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
      <header className="flex flex-col gap-2 md:col-span-full">
        <h2 className="m-0 font-display text-2xl font-semibold text-brand-forest">
          Welcome back, {user?.name?.split(' ')[0] || 'manager'} 🌱
        </h2>
        <p className="m-0 text-sm text-brand-muted sm:text-base">
          Plan meaningful experiences, assign volunteer crews, and showcase impact with visual storytelling.
        </p>
      </header>
      <DashboardCard
        title="Event pipeline"
        description="Proposals, approvals, and execution timelines live here. The workflow module arrives in Phase 2."
      >
        <span className="inline-flex items-center gap-2 rounded-full bg-brand-sky/20 px-3 py-1 text-sm font-medium text-brand-sky">
          🚧 Drafting tools on the way
        </span>
      </DashboardCard>
      <DashboardCard
        title="Volunteer coordination"
        description="Build task boards, shift schedules, and attendance trackers to keep every event humming."
      >
        <p className="m-0 text-sm text-brand-muted">
          Invite volunteers and assign micro-missions once the coordination suite launches.
        </p>
      </DashboardCard>
      <DashboardCard
        title="Gallery management"
        description="Curate post-event photos with captions, highlight beneficiary quotes, and celebrate eco-wins."
      >
        <p className="m-0 text-sm text-brand-muted">Upload queues and moderation tools will land in Phase 2.</p>
      </DashboardCard>
    </div>
  );
}
