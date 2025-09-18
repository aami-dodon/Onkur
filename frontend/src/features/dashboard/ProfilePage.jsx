import { useEffect, useMemo, useState } from 'react';

import useDocumentTitle from '../../lib/useDocumentTitle';
import { useAuth } from '../auth/AuthContext';
import ProfileEditor from '../volunteer/ProfileEditor';
import { fetchVolunteerProfile, updateVolunteerProfile } from '../volunteer/api';
import DashboardCard from './DashboardCard';
import { determinePrimaryRole } from './roleUtils';

function buildIntro(role, firstName) {
  switch (role) {
    case 'EVENT_MANAGER':
      return {
        title: `Share your expertise, ${firstName}`,
        description:
          'Keep your skills, credentials, and contact details current so volunteers know who is guiding their experience.',
      };
    case 'SPONSOR':
      return {
        title: `Tell partners about your focus, ${firstName}`,
        description:
          'Update your interests and availability to stay in sync with the campaigns and stories you champion.',
      };
    case 'ADMIN':
      return {
        title: `Steward your platform presence, ${firstName}`,
        description:
          'Refresh your profile to help teams reach the right steward when approvals or support are needed.',
      };
    default:
      return {
        title: `Tune your volunteer profile, ${firstName}`,
        description:
          'Highlight your strengths, availability, and motivations so coordinators can match you to the perfect opportunities.',
      };
  }
}

export default function ProfilePage({ role, roles = [] }) {
  const { token, user, refreshProfile } = useAuth();
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState({ phase: 'loading', message: '' });

  const firstName = useMemo(() => user?.name?.split(' ')[0] || 'there', [user?.name]);
  const activeRole = useMemo(
    () => determinePrimaryRole(roles, role),
    [roles, role]
  );
  const intro = useMemo(
    () => buildIntro(activeRole, firstName),
    [activeRole, firstName]
  );

  useDocumentTitle('Onkur | Profile');

  useEffect(() => {
    if (!token) return undefined;
    let active = true;

    setStatus({ phase: 'loading', message: '' });

    (async () => {
      try {
        const response = await fetchVolunteerProfile(token);
        if (!active) return;
        setProfile(response);
        setStatus({ phase: 'ready', message: '' });
      } catch (error) {
        if (!active) return;
        setStatus({ phase: 'error', message: error.message || 'Unable to load your profile right now.' });
      }
    })();

    return () => {
      active = false;
    };
  }, [token]);

  const handleSave = async (payload) => {
    if (!token) {
      throw new Error('You need to be signed in to update your profile.');
    }
    const updated = await updateVolunteerProfile(token, payload);
    setProfile(updated);
    try {
      await refreshProfile();
    } catch (error) {
      console.warn('Unable to refresh profile', error);
    }
    return updated;
  };

  const isLoading = status.phase === 'loading';

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h2 className="m-0 font-display text-2xl font-semibold text-brand-forest">{intro.title}</h2>
        <p className="m-0 text-sm text-brand-muted sm:text-base">{intro.description}</p>
      </header>
      {status.phase === 'error' ? (
        <p className="m-0 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{status.message}</p>
      ) : null}
      <DashboardCard
        title="Profile & availability"
        description="Keep this up to date so the right opportunities find you first."
      >
        {isLoading ? (
          <p className="m-0 text-sm text-brand-muted">Loading your profile…</p>
        ) : profile ? (
          <ProfileEditor profile={profile} onSave={handleSave} />
        ) : (
          <p className="m-0 text-sm text-brand-muted">We could not load your profile yet. Please try again shortly.</p>
        )}
      </DashboardCard>
    </div>
  );
}
