import { Link, Navigate, useParams } from 'react-router-dom';
import useDocumentTitle from '../../lib/useDocumentTitle';

const JOURNEY_CONTENT = {
  volunteers: {
    title: 'Volunteer journey',
    intro:
      'Follow a day-in-the-life of an Onkur volunteer—from finding opportunities to celebrating the difference you make.',
    heroHighlight: 'Create momentum with hands-on action and a story worth sharing.',
    experience: [
      {
        label: 'Discover events you love',
        description:
          'Browse curated events aligned to your skills and availability, and RSVP instantly from any device.',
      },
      {
        label: 'Show up prepared',
        description:
          'Get gentle reminders, task outlines, and local insights so you arrive confident and ready to make an impact.',
      },
      {
        label: 'Reflect and grow',
        description:
          'Log your hours, earn eco-badges, and capture photo memories that prove the change you helped create.',
      },
    ],
    features: [
      'Personalized event recommendations tailored to your interests.',
      'One-tap check-ins, attendance tracking, and digital certificates.',
      'Eco-journals that celebrate every badge, milestone, and story.',
    ],
    cta: {
      label: 'Register as a volunteer',
      roleQuery: 'VOLUNTEER',
    },
  },
  'event-managers': {
    title: 'Event manager journey',
    intro:
      'See how event managers orchestrate smooth gatherings, empower volunteers, and report back with confidence.',
    heroHighlight: 'Craft experiences that energize your community and honor every contribution.',
    experience: [
      {
        label: 'Design meaningful events',
        description:
          'Create immersive programs with location lookups, skill tags, and role assignments that stay organized.',
      },
      {
        label: 'Coordinate in the field',
        description:
          'Track attendance live, broadcast updates, and upload gallery-ready photos without leaving the event.',
      },
      {
        label: 'Report the ripple effect',
        description:
          'Share dashboards, automate impact summaries, and celebrate sponsors with transparent outcomes.',
      },
    ],
    features: [
      'Collaborative task boards for every milestone.',
      'Attendance and hour logs that sync automatically with volunteer profiles.',
      'Sponsor-ready reports that highlight outcomes and gratitude.',
    ],
    cta: {
      label: 'Register as an event manager',
      roleQuery: 'EVENT_MANAGER',
    },
  },
  sponsors: {
    title: 'Sponsor journey',
    intro:
      'Experience how partners stay connected to the impact they fund and the communities they uplift.',
    heroHighlight: 'Invest with clarity, celebrate stories, and inspire continued generosity.',
    experience: [
      {
        label: 'Discover initiatives that align',
        description:
          'Review verified projects with transparent budgets, timelines, and needs that match your mission.',
      },
      {
        label: 'Stay present throughout',
        description:
          'Receive live updates, gallery previews, and gratitude messages while events are still unfolding.',
      },
      {
        label: 'Measure the outcomes',
        description:
          'Download ROI dashboards, share testimonials, and see the lasting change your contribution unlocked.',
      },
    ],
    features: [
      'Impact dashboards that translate numbers into narratives.',
      'Curated gallery takeovers for brand alignment and recognition.',
      'Automated gratitude packages for your teams and stakeholders.',
    ],
    cta: {
      label: 'Become an Onkur sponsor',
      roleQuery: 'SPONSOR',
    },
  },
  admins: {
    title: 'Admin journey',
    intro:
      'Understand how administrators steward Onkur—keeping communities safe, content vibrant, and systems humming.',
    heroHighlight: 'Empower every role while safeguarding the movement behind the scenes.',
    experience: [
      {
        label: 'Curate trusted memberships',
        description:
          'Verify new members, assign roles, and maintain clarity across teams without heavy manual work.',
      },
      {
        label: 'Elevate the story',
        description:
          'Moderate galleries, spotlight impact, and keep the platform feeling warm, inclusive, and actionable.',
      },
      {
        label: 'Steer strategic insight',
        description:
          'Monitor platform health, respond to support needs, and share insights that guide future initiatives.',
      },
    ],
    features: [
      'Role management with intuitive approvals and safeguards.',
      'Content moderation flows that balance safety with celebration.',
      'Unified analytics for memberships, events, and sponsorships.',
    ],
    cta: {
      label: 'Connect with the Onkur team',
      roleQuery: null,
    },
  },
};

export default function JourneyDetailsPage() {
  const { role } = useParams();
  const journey = JOURNEY_CONTENT[role];

  if (!journey) {
    return <Navigate to="/" replace />;
  }

  useDocumentTitle(`Onkur | ${journey.title}`);

  const signupLink = journey.cta.roleQuery ? `/signup?role=${journey.cta.roleQuery}` : '/signup';

  return (
    <div className="journey-page">
      <section className="journey-hero">
        <div className="journey-hero__content">
          <p className="journey-hero__eyebrow">Tailored Onkur experiences</p>
          <h1>{journey.title}</h1>
          <p className="journey-hero__intro">{journey.intro}</p>
          <p className="journey-hero__highlight">{journey.heroHighlight}</p>
          <div className="journey-hero__actions">
            <Link className="btn-primary" to={signupLink}>
              {journey.cta.label}
            </Link>
            <Link className="btn-secondary" to="/">
              Explore all journeys
            </Link>
          </div>
        </div>
      </section>

      <section className="journey-experience">
        <h2>Your path with Onkur</h2>
        <div className="journey-experience__list">
          {journey.experience.map((step) => (
            <article key={step.label}>
              <h3>{step.label}</h3>
              <p>{step.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="journey-features">
        <h2>Why this journey shines</h2>
        <ul>
          {journey.features.map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>
      </section>

      <section className="journey-cta">
        <div className="journey-cta__card">
          <h2>Bring this journey to life</h2>
          <p>
            Ready to experience the full suite of tools built for this role? Join Onkur and start collaborating with a community
            that cares deeply about regenerative change.
          </p>
          <div className="journey-cta__actions">
            <Link className="btn-primary" to={signupLink}>
              {journey.cta.label}
            </Link>
            <Link className="btn-secondary" to="/login">
              Already registered? Sign in
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
