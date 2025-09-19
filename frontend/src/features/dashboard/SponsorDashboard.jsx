import { useMemo } from 'react';
import DashboardCard from './DashboardCard';
import { useAuth } from '../auth/AuthContext';
import useDocumentTitle from '../../lib/useDocumentTitle';
import ProfileCompletionCallout from './ProfileCompletionCallout';
import calculateProfileProgress from './profileProgress';

export default function SponsorDashboard() {
  const { user } = useAuth();
  const firstName = user?.name?.split(' ')[0] || 'sponsor';
  useDocumentTitle(`Onkur | Thank you, ${firstName} 🌍`);

  const profileProgress = useMemo(
    () => calculateProfileProgress(user?.profile),
    [user?.profile]
  );

  return (
    <div className="grid gap-5 md:[grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
      <header className="flex flex-col gap-2 md:col-span-full">
        <h2 className="m-0 font-display text-2xl font-semibold text-brand-forest">
          Thank you, {firstName} 🌍
        </h2>
        <p className="m-0 text-sm text-brand-muted sm:text-base">
          Track the visibility of your contributions and stay close to the stories your support makes possible.
        </p>
      </header>
      <ProfileCompletionCallout
        progress={profileProgress}
        className="md:col-span-full"
        title="Complete your profile to spotlight your mission"
        description="Introduce your organization, causes, and recognition preferences so we can celebrate your sponsorship the right way."
      />
      <DashboardCard
        title="Active sponsorships"
        description="A summary of the events and initiatives you are fueling will appear here soon."
      >
        <span className="inline-flex items-center gap-2 rounded-full bg-brand-sky/20 px-3 py-1 text-sm font-medium text-brand-sky">
          💚 Impact reporting under construction
        </span>
      </DashboardCard>
      <DashboardCard
        title="Recognition toolkit"
        description="Logos, shout-outs, and gallery spotlights will be coordinated through this workspace."
      >
        <p className="m-0 text-sm text-brand-muted">Set preferred visibility guidelines once the toolkit unlocks.</p>
      </DashboardCard>
      <DashboardCard
        title="Impact reports"
        description="Download snapshots of volunteer hours, stories, and carbon savings tied to your sponsorship."
      >
        <p className="m-0 text-sm text-brand-muted">Analytics pipelines are being seeded for upcoming phases.</p>
      </DashboardCard>
    </div>
  );
}
