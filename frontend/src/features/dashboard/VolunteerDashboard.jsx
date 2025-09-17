import DashboardCard from './DashboardCard';
import { useAuth } from '../auth/AuthContext';

export default function VolunteerDashboard() {
  const { user } = useAuth();

  return (
    <div className="grid gap-5 md:[grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
      <header className="flex flex-col gap-2 md:col-span-full">
        <h2 className="m-0 font-display text-2xl font-semibold text-brand-forest">
          Hi {user?.name?.split(' ')[0] || 'volunteer'} 👋
        </h2>
        <p className="m-0 text-sm text-brand-muted sm:text-base">
          Your dashboard keeps track of upcoming events, logged hours, and the eco-badges you earn while supporting community
          action.
        </p>
      </header>
      <DashboardCard
        title="Upcoming commitments"
        description="You do not have any events scheduled yet. Explore opportunities once the event hub launches."
      >
        <span className="inline-flex items-center gap-2 rounded-full bg-brand-sky/20 px-3 py-1 text-sm font-medium text-brand-sky">
          📅 Events opening soon
        </span>
      </DashboardCard>
      <DashboardCard
        title="Impact tracker"
        description="Log volunteer hours to grow your seedling into a flourishing forest. Metrics arrive in Phase 2."
      >
        <p className="m-0 text-sm text-brand-muted">
          Hours logged: <strong className="text-brand-forest">0</strong>
        </p>
        <p className="m-0 text-sm text-brand-muted">
          Eco-badges unlocked: <strong className="text-brand-forest">Seedling</strong>
        </p>
      </DashboardCard>
      <DashboardCard
        title="Stories & galleries"
        description="Share photos and reflections from the ground. Galleries unlock once events start rolling in."
      >
        <p className="m-0 text-sm text-brand-muted">
          Keep an eye out for featured community stories curated by our event teams.
        </p>
      </DashboardCard>
    </div>
  );
}
