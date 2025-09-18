import { Link } from 'react-router-dom';

import { NAV_ITEMS } from './navConfig';

export default function DesktopNav({ active }) {
  return (
    <nav className="hidden border-t border-white/20 bg-brand-green/95 backdrop-blur-sm md:block">
      <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-6 py-3">
        {NAV_ITEMS.map((item) => {
          const isActive = item.id === active;
          return (
            <Link
              key={item.id}
              to={item.to}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold tracking-wide transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70 ${
                isActive
                  ? 'bg-white/20 text-white shadow-[0_8px_20px_rgba(6,55,24,0.35)]'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
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
      </div>
    </nav>
  );
}
