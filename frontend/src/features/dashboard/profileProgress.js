export function calculateProfileProgress(profile) {
  if (!profile) {
    return null;
  }

  const requirements = [
    {
      label: 'Add at least one skill',
      complete: Array.isArray(profile.skills) && profile.skills.length > 0,
    },
    {
      label: 'Share the causes you care about',
      complete: Array.isArray(profile.interests) && profile.interests.length > 0,
    },
    {
      label: 'Set your availability',
      complete: Boolean(profile.availability && profile.availability.trim().length),
    },
    {
      label: 'Add your home base or region',
      complete: Boolean(profile.location && profile.location.trim().length),
    },
    {
      label: 'Introduce yourself with a short bio',
      complete: Boolean(profile.bio && profile.bio.trim().length),
    },
  ];

  const completed = requirements.filter((item) => item.complete).length;
  const percentage = Math.round((completed / requirements.length) * 100);
  const missing = requirements.filter((item) => !item.complete).map((item) => item.label);

  return {
    percentage,
    missing,
    isComplete: completed === requirements.length,
  };
}

export default calculateProfileProgress;
