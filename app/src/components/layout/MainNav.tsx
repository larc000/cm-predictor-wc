'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  {
    href: '/fase-eliminatoria',
    label: 'Knockout Stage',
    mobileLabel: 'Knockout Stage',
    mobileSubtitle: 'Round of 16 · QF · SF · Final',
    icon: '[]',
    accent: 'orange'
  },
  {
    href: '/reglas',
    label: 'Rules',
    mobileLabel: 'Rules',
    mobileSubtitle: 'How points are scored',
    icon: '▤',
    accent: 'light'
  },
  {
    href: '/leaderboard',
    label: 'Leaderboard',
    mobileLabel: 'Leaderboard',
    mobileSubtitle: 'Global & Friends rankings',
    icon: '♕',
    accent: 'blue'
  }
];

export function MainNav() {
  const pathname = usePathname();

  return (
    <nav className="tabs" aria-label="Secciones">
      {navItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            className={`tab-button ${isActive ? 'active' : ''}`}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
          >
            <span className="tab-button-label">{item.label}</span>
            <span className="mobile-nav-card-accent" data-accent={item.accent} aria-hidden="true" />
            <span className="mobile-nav-card-content">
              <span className="mobile-nav-card-icon" aria-hidden="true">
                {item.icon}
              </span>
              <span className="mobile-nav-card-copy">
                <span className="mobile-nav-card-title">{item.mobileLabel}</span>
                <span className="mobile-nav-card-subtitle">{item.mobileSubtitle}</span>
              </span>
              <span className="mobile-nav-card-arrow" aria-hidden="true">
                ›
              </span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
