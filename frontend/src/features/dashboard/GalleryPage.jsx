import { useMemo } from 'react';

import useDocumentTitle from '../../lib/useDocumentTitle';
import { useAuth } from '../auth/AuthContext';
import DashboardCard from './DashboardCard';

const GALLERY_SPOTLIGHTS = [
  {
    id: 'mangrove',
    emoji: '🌿',
    title: 'Mangrove guardians',
    summary: '50 volunteers restored 2km of coastline habitat with new mangrove plantings.',
    impact: '1,200 seedlings planted',
    tags: ['Habitat', 'Coastal resilience'],
  },
  {
    id: 'bike',
    emoji: '🚲',
    title: 'Bike kitchen reboot',
    summary: 'A youth-led repair-a-thon tuned 86 community bikes and hosted a pop-up safety clinic.',
    impact: '86 bikes back on the road',
    tags: ['Mobility', 'Youth'],
  },
  {
    id: 'canopy',
    emoji: '🌳',
    title: 'City canopy census',
    summary: 'Volunteers catalogued 1,400 trees and tagged gaps for next season’s planting map.',
    impact: '12 new micro-forests planned',
    tags: ['Urban forestry', 'Data'],
  },
];

const STORY_TIPS = [
  'Capture before-and-after scenes to show how spaces transform.',
  'Highlight two quotes—one from a volunteer and one from a community member.',
  'Log attendance and hours so sponsors can see their impact grow.',
  'Upload at least five photos per story to keep galleries immersive.',
];

function buildIntro(role, firstName) {
  switch (role) {
    case 'EVENT_MANAGER':
      return {
        title: `Curate your event stories, ${firstName}`,
        description:
          'Every gallery entry helps teams relive the day. Organize photos, quotes, and metrics so celebrations stay vibrant.',
      };
    case 'SPONSOR':
      return {
        title: `Celebrate the partnerships you power, ${firstName}`,
        description:
          'Review highlight reels from supported events and gather assets for your next board update.',
      };
    case 'ADMIN':
      return {
        title: `Moderate and elevate Onkur stories, ${firstName}`,
        description:
          'Ensure every gallery reflects our shared values, then surface inspiring examples to the broader community.',
      };
    default:
      return {
        title: `Revisit the moments you created, ${firstName}`,
        description:
          'Explore galleries from recent events, download your favourite memories, and share them with your crew.',
      };
  }
}

export default function GalleryPage({ role }) {
  const { user } = useAuth();
  const firstName = useMemo(() => user?.name?.split(' ')[0] || 'friend', [user?.name]);
  const intro = useMemo(() => buildIntro(role, firstName), [role, firstName]);

  useDocumentTitle('Onkur | Gallery');

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h2 className="m-0 font-display text-2xl font-semibold text-brand-forest">{intro.title}</h2>
        <p className="m-0 text-sm text-brand-muted sm:text-base">{intro.description}</p>
      </header>
      <DashboardCard
        title="Spotlight galleries"
        description="The latest stories from our community. Dive in for photos, quotes, and measurable impact."
        className="md:col-span-full"
      >
        <div className="grid gap-4 md:[grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
          {GALLERY_SPOTLIGHTS.map((gallery) => (
            <article
              key={gallery.id}
              className="flex flex-col gap-3 rounded-2xl border border-brand-forest/10 bg-brand-sand/60 p-4"
            >
              <header className="flex items-center gap-3">
                <span aria-hidden="true" className="text-2xl">
                  {gallery.emoji}
                </span>
                <div>
                  <h3 className="m-0 text-base font-semibold text-brand-forest">{gallery.title}</h3>
                  <p className="m-0 text-xs font-semibold uppercase tracking-[0.14em] text-brand-muted">
                    {gallery.impact}
                  </p>
                </div>
              </header>
              <p className="m-0 text-sm text-brand-muted">{gallery.summary}</p>
              <div className="mt-auto flex flex-wrap gap-2">
                {gallery.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-brand-forest/20 bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-forest"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </DashboardCard>
      <DashboardCard
        title="Storytelling checklist"
        description="Use this quick list before publishing to keep every gallery polished and informative."
      >
        <ol className="m-0 list-decimal space-y-2 pl-5 text-sm text-brand-muted">
          {STORY_TIPS.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ol>
      </DashboardCard>
    </div>
  );
}
