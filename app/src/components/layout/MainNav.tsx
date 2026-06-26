'use client';

import Image, { type StaticImageData } from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import iconKnockout from '@/assets/icon-knockout.png';
import iconLeaderboard from '@/assets/icon-leaderboard.png';
import iconRules from '@/assets/icon-rules.png';

type NavItem = {
  href: string;
  label: string;
  mobileLabel: string;
  mobileSubtitle: string;
  icon: StaticImageData;
  accent: 'orange' | 'blue' | 'light';
};

const navItems: NavItem[] = [
  {
    href: '/knockout-stage',
    label: 'Knockout Stage',
    mobileLabel: 'Knockout Stage',
    mobileSubtitle: 'Round of 32, 16, QF, SF and Final',
    icon: iconKnockout,
    accent: 'orange'
  },
  {
    href: '/leaderboard',
    label: 'Leaderboard',
    mobileLabel: 'Leaderboard',
    mobileSubtitle: 'Global & Colleagues rankings',
    icon: iconLeaderboard,
    accent: 'blue'
  },
  {
    href: '/rules',
    label: 'Rules',
    mobileLabel: 'Rules',
    mobileSubtitle: 'How points are scored',
    icon: iconRules,
    accent: 'light'
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
            data-accent={item.accent}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
          >
            <span className="tab-button-label">{item.label}</span>
            <span className="mobile-nav-card-accent" data-accent={item.accent} aria-hidden="true" />
            <span className="mobile-nav-card-content">
              <span className="mobile-nav-card-icon" aria-hidden="true">
                <Image src={item.icon} alt="" width={24} height={24} />
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
