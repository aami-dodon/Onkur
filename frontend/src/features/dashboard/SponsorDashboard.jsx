import { useEffect, useMemo, useState } from 'react';
import DashboardCard from './DashboardCard';
import { useAuth } from '../auth/AuthContext';
import useDocumentTitle from '../../lib/useDocumentTitle';
import ProfileCompletionCallout from './ProfileCompletionCallout';
import calculateProfileProgress from './profileProgress';
import SponsorOnboardingForm from '../sponsors/SponsorOnboardingForm';
import SponsorSponsorshipList from '../sponsors/SponsorSponsorshipList';
import {
  applyForSponsor,
  updateSponsorProfile,
  fetchSponsorDashboard,
  fetchSponsorReports,
} from '../sponsors/api';

export default function SponsorDashboard() {
  const { token, user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [sponsorships, setSponsorships] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reportStatus, setReportStatus] = useState({ state: 'idle', message: '' });
  const [profileSubmitting, setProfileSubmitting] = useState(false);

  const firstName = user?.name?.split(' ')[0] || 'sponsor';
  useDocumentTitle(`Onkur | Thank you, ${firstName} 🌍`);

  const profileProgress = useMemo(() => calculateProfileProgress(user?.profile), [user?.profile]);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError('');
    (async () => {
      try {
        const data = await fetchSponsorDashboard(token);
        if (!active) return;
        setProfile(data.profile || null);
        setSponsorships(Array.isArray(data.sponsorships) ? data.sponsorships : []);
        setMetrics(data.metrics || null);
      } catch (dashError) {
        if (!active) return;
        setError(dashError.message || 'Unable to load sponsor dashboard.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [token]);

  const refreshDashboard = async () => {
    if (!token) return;
    setError('');
    try {
      const data = await fetchSponsorDashboard(token);
      setProfile(data.profile || null);
      setSponsorships(Array.isArray(data.sponsorships) ? data.sponsorships : []);
      setMetrics(data.metrics || null);
    } catch (dashError) {
      setError(dashError.message || 'Unable to refresh sponsor dashboard.');
    }
  };

  const handleOnboardingSubmit = async (payload) => {
    if (!token) {
      throw new Error('Authentication required');
    }
    setProfileSubmitting(true);
    try {
      const response = await applyForSponsor(token, payload);
      setProfile(response.profile || response?.profile || null);
      await refreshDashboard();
    } finally {
      setProfileSubmitting(false);
    }
  };

  const handleProfileUpdate = async (payload) => {
    if (!token) {
      throw new Error('Authentication required');
    }
    setProfileSubmitting(true);
    try {
      const response = await updateSponsorProfile(token, payload);
      setProfile(response.profile || response?.profile || null);
      await refreshDashboard();
    } finally {
      setProfileSubmitting(false);
    }
  };

  const handleReportRefresh = async () => {
    if (!token) {
      throw new Error('Authentication required');
    }
    setReportStatus({ state: 'loading', message: '' });
    try {
      const data = await fetchSponsorReports(token);
      setReports(Array.isArray(data.reports) ? data.reports : []);
      if (data.profile) {
        setProfile(data.profile);
      }
      setReportStatus({
        state: 'success',
        message: 'Latest impact report delivered to your inbox.',
      });
    } catch (reportError) {
      setReportStatus({
        state: 'error',
        message: reportError.message || 'Unable to refresh reports right now.',
      });
    }
  };

  const statusMessage = () => {
    if (!profile) {
      return 'Apply to become a sponsor so the community can celebrate you on every event.';
    }
    switch (profile.status) {
      case 'APPROVED':
        return 'Your sponsorships are live and appear across event and gallery pages.';
      case 'DECLINED':
        return 'We could not approve the current application. Update your details to try again.';
      default:
        return 'Your application is under review. We will notify you once it is approved.';
    }
  };

  return (
    <div className="grid gap-5 md:[grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
      <header className="flex flex-col gap-2 md:col-span-full">
        <h2 className="m-0 font-display text-2xl font-semibold text-brand-forest">
          Thank you, {firstName} 🌍
        </h2>
        <p className="m-0 text-sm text-brand-muted sm:text-base">{statusMessage()}</p>
      </header>
      <ProfileCompletionCallout
        progress={profileProgress}
        className="md:col-span-full"
        title="Complete your profile to spotlight your mission"
        description="Introduce your organization, causes, and recognition preferences so we can celebrate your sponsorship the right way."
      />
      {error ? (
        <p className="md:col-span-full m-0 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {loading ? (
        <p className="md:col-span-full m-0 text-sm text-brand-muted">Loading sponsor workspace…</p>
      ) : null}
      {(!profile || profile.status !== 'APPROVED') && !loading ? (
        <SponsorOnboardingForm
          initialValues={profile || {}}
          onSubmit={profile ? handleProfileUpdate : handleOnboardingSubmit}
          isSubmitting={profileSubmitting}
          ctaLabel={profile ? 'Update sponsor profile' : 'Submit sponsor application'}
        />
      ) : null}
      {profile && profile.status === 'APPROVED' ? (
        <SponsorSponsorshipList sponsorships={sponsorships} metrics={metrics} />
      ) : null}
      {profile && profile.status === 'APPROVED' ? (
        <DashboardCard
          title="Impact reports"
          description="Refresh the latest volunteer hours and gallery views tied to your sponsorships."
        >
          <div className="flex flex-col gap-3">
            <button
              type="button"
              className="btn-primary w-full sm:w-auto"
              onClick={handleReportRefresh}
              disabled={reportStatus.state === 'loading'}
            >
              {reportStatus.state === 'loading' ? 'Refreshing…' : 'Email me an updated report'}
            </button>
            {reportStatus.state === 'error' ? (
              <p className="m-0 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {reportStatus.message}
              </p>
            ) : null}
            {reportStatus.state === 'success' ? (
              <p className="m-0 rounded-xl border border-brand-green/20 bg-brand-sand/70 p-3 text-sm text-brand-forest">
                {reportStatus.message}
              </p>
            ) : null}
            {reports.length ? (
              <ul className="m-0 list-disc space-y-2 pl-5 text-sm text-brand-muted">
                {reports.map((report) => (
                  <li key={report.sponsorshipId}>
                    {report.event?.title || 'Sponsored event'} · {report.totals?.totalHours || 0}{' '}
                    volunteer hours · {report.gallery?.viewCount || 0} gallery views
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </DashboardCard>
      ) : null}
    </div>
  );
}
