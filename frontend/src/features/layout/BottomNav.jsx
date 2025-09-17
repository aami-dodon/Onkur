const NAV_ITEMS = [
  { id: 'home', label: 'Home', icon: '🌿' },
  { id: 'events', label: 'Events', icon: '📅' },
  { id: 'gallery', label: 'Gallery', icon: '🖼️' },
  { id: 'profile', label: 'Profile', icon: '😊' },
];

export default function BottomNav({ active }) {
  return (
    <nav className="bottom-nav" aria-label="Primary">
      {NAV_ITEMS.map((item) => (
        <button
          key={item.id}
          type="button"
          className={item.id === active ? 'active' : ''}
          aria-current={item.id === active ? 'page' : undefined}
          disabled={item.id !== 'home'}
        >
          <span>{item.icon}</span>
          {item.label}
        </button>
      ))}
    </nav>
  );
}
