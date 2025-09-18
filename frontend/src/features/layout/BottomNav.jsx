import { Link } from 'react-router-dom';

import { NAV_ITEMS } from './navConfig';

export default function BottomNav({ active }) {
  return (
    <nav
      className="sticky bottom-0 left-0 right-0 grid grid-cols-4 gap-2 border-t border-brand-green/15 bg-white/95 px-3 py-2 shadow-[0_-6px_18px_rgba(47,133,90,0.12)] backdrop-blur-sm md:hidden"
      aria-label="Primary"
    >
      {NAV_ITEMS.map((item) => {
        const isActive = item.id === active;
        return (
          <Link
            key={item.id}
            to={item.to}
            className={`flex flex-col items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green/60 ${
              isActive
                ? 'bg-brand-green/15 text-brand-green'
                : 'text-brand-muted hover:text-brand-green'
            }`}
            aria-current={isActive ? 'page' : undefined}
          >
            <span aria-hidden="true" className="text-base">
              {item.icon}
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
