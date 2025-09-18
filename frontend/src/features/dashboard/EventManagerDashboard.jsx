import { useAuth } from '../auth/AuthContext';
import useDocumentTitle from '../../lib/useDocumentTitle';
import EventManagerWorkspace from '../event-manager/EventManagerWorkspace';

export default function EventManagerDashboard() {
  const { user } = useAuth();
  const firstName = user?.name?.split(' ')[0] || 'manager';
  useDocumentTitle(`Onkur | Welcome back, ${firstName} 🌱`);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h2 className="m-0 font-display text-2xl font-semibold text-brand-forest">Welcome back, {firstName} 🌱</h2>
        <p className="m-0 text-sm text-brand-muted sm:text-base">
          Launch events, guide your volunteer crews, and share the impact your team creates.
        </p>
      </header>
      <EventManagerWorkspace />
    </div>
  );
}
