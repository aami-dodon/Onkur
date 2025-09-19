import { Link, Navigate } from 'react-router-dom';
import useDocumentTitle from '../../lib/useDocumentTitle';
import { useAuth } from '../auth/AuthContext';

const HIGHLIGHTS = [
  {
    title: 'Volunteer Journeys',
    description:
      'Design personal impact paths, log hours effortlessly, and celebrate eco-badges as you grow with your community.',
    icon: '🌱',
  },
  {
    title: 'Immersive Event Galleries',
    description:
      'Share vivid photo stories from every event, spotlight community voices, and keep memories alive together.',
    icon: '📸',
  },
  {
    title: 'Transparent Sponsorships',
    description:
      'Give partners the visibility they deserve with branded galleries, outcome reports, and measurable ROI dashboards.',
    icon: '🤝',
  },
];

const ROLE_CARDS = [
  {
    role: 'Volunteers',
    blurb:
      'Discover events that match your skills, register instantly, and collect hours, certificates, and stories of impact.',
    accent: 'leaf',
  },
  {
    role: 'Event Managers',
    blurb:
      'Plan meaningful gatherings, assign tasks, track attendance, and publish galleries that showcase every milestone.',
    accent: 'sun',
  },
  {
    role: 'Sponsors',
    blurb:
      'Champion local change with funding or resources and receive beautiful, data-rich reports on how you made a difference.',
    accent: 'wave',
  },
  {
    role: 'Admins',
    blurb:
      'Steward the platform, approve initiatives, moderate galleries, and ensure everyone experiences Onkur at its best.',
    accent: 'roots',
  },
];

const IMPACT_STATS = [
  { label: 'Community hours coordinated', value: '42K+' },
  { label: 'Stories captured in galleries', value: '3.5K' },
  { label: 'Sponsors reporting higher ROI', value: '92%' },
];

export default function HomePage() {
  const { isAuthenticated } = useAuth();
  useDocumentTitle('Onkur | Nature · Sustainability · Community');

  if (isAuthenticated) {
    return <Navigate to="/app" replace />;
  }

  return (
    <div className="home-page">
      <section className="home-hero">
        <div className="home-hero__content">
          <span className="home-hero__eyebrow">Nature · Sustainability · Community</span>
          <h2>Grow local impact with Onkur.</h2>
          <p>
            Onkur is the mobile-first volunteering platform that brings volunteers, event managers,
            sponsors, and administrators together to spark lasting environmental and social change.
            Plan immersive events, capture living galleries, and measure the ripple effects of every
            action.
          </p>
          <div className="home-hero__actions">
            <Link className="btn-primary" to="/signup">
              Join the movement
            </Link>
            <Link className="btn-secondary" to="/login">
              Sign in
            </Link>
          </div>
          <div className="home-hero__stats">
            {IMPACT_STATS.map((stat) => (
              <div key={stat.label}>
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="home-hero__visual">
          <div className="hero-badge hero-badge--primary">
            <span>🍃</span>
            <p>Track eco-badges and celebrate milestones instantly.</p>
          </div>
          <div className="hero-badge hero-badge--secondary">
            <span>🪴</span>
            <p>See your community thrive with transparent progress.</p>
          </div>
        </div>
      </section>

      <section className="home-highlight">
        <h3>Designed as a living ecosystem</h3>
        <p>
          Every workflow, report, and gallery is crafted to feel warm, transparent, and actionable.
          Onkur keeps teams aligned with responsive tools that work beautifully on mobile and
          desktop alike.
        </p>
        <div className="home-highlight__grid">
          {HIGHLIGHTS.map((item) => (
            <article key={item.title}>
              <span>{item.icon}</span>
              <h4>{item.title}</h4>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="home-roles">
        <div className="home-roles__intro">
          <h3>Built for every steward of change</h3>
          <p>
            Purposeful features adapt to each role so every stakeholder—volunteers, organizers,
            sponsors, and admins—can focus on what matters most: nurturing impact.
          </p>
        </div>
        <div className="home-roles__grid">
          {ROLE_CARDS.map((role) => (
            <article key={role.role} className={`role-card role-card--${role.accent}`}>
              <h4>{role.role}</h4>
              <p>{role.blurb}</p>
              <div className="role-card__cta">
                <span>Discover their journey →</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="home-journey">
        <div className="home-journey__card">
          <h3>Your day with Onkur</h3>
          <ul>
            <li>
              <strong>Morning check-in</strong>
              <p>
                Review upcoming events, confirm volunteers, and highlight new sponsorship
                opportunities.
              </p>
            </li>
            <li>
              <strong>In the field</strong>
              <p>
                Capture photos, log attendance, and notify your community—all from a mobile-friendly
                workspace.
              </p>
            </li>
            <li>
              <strong>Evening reflection</strong>
              <p>
                Publish gallery stories, unlock eco-badges, and send dashboards that prove your
                collective impact.
              </p>
            </li>
          </ul>
        </div>
        <div className="home-journey__card">
          <h3>Why teams choose Onkur</h3>
          <ul>
            <li>
              <strong>Mobile-first design</strong>
              <p>Clean, accessible interactions that feel at home in the field.</p>
            </li>
            <li>
              <strong>Insightful analytics</strong>
              <p>Real-time dashboards for hours logged, gallery engagement, and sponsor ROI.</p>
            </li>
            <li>
              <strong>Community storytelling</strong>
              <p>Rich galleries that honor beneficiaries and keep momentum alive.</p>
            </li>
          </ul>
        </div>
      </section>

      <section className="home-cta">
        <div className="home-cta__content">
          <h3>Ready to nurture your next act of care?</h3>
          <p>
            Join Onkur to connect purpose-driven people, illuminate every story, and measure the
            change you cultivate together.
          </p>
        </div>
        <div className="home-cta__actions">
          <Link className="btn-primary" to="/signup">
            Create your account
          </Link>
          <Link className="btn-secondary" to="/login">
            Explore the platform
          </Link>
        </div>
      </section>
    </div>
  );
}
