'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/fase-grupos', label: 'Fase de Grupos' },
  { href: '/fase-eliminatoria', label: 'Fase Eliminatoria' },
  { href: '/reglas', label: 'Reglas' },
  { href: '/leaderboard', label: 'Leaderboard' }
];

export function MainNav() {
  const pathname = usePathname();

  return (
    <nav className="tabs" aria-label="Secciones">
      {navItems.map((item) => {
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.href}
            className={`tab-button ${isActive ? 'active' : ''}`}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
