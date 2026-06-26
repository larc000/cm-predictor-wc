import Image from 'next/image';
import type { ReactNode } from 'react';
import fifaLogo from '@/assets/FIFA.png';
import newLogo from '@/assets/new_logo.png';
import type { AppUser } from '@/lib/types';

type ShellProps = {
  appUser: AppUser | null;
  allowedEmailDomain: string;
  onSignOut: () => void;
  children: ReactNode;
};

export function Shell({ appUser, allowedEmailDomain, onSignOut, children }: ShellProps) {
  return (
    <main className={`app-shell ${appUser ? 'is-authenticated' : 'is-public'}`}>
      <header className="topbar">
        <Image
          className="brand-logo-image"
          src={newLogo}
          alt="World Cup Predictor CM"
          sizes="(min-width: 900px) 350px, calc(100vw - 40px)"
          priority
        />

        <div className="hero-lockup">
          <Image
            className="fifa-title-image"
            src={fifaLogo}
            alt="FIFA World Cup 2026"
            sizes="(min-width: 900px) 240px, 60vw"
            priority
          />
          <div className="hero-divider" aria-hidden="true" />
          <div>
            <h1>Predict the score</h1>
            <p className="subtitle">
              Compete with colleagues.<br/> Climb the global leaderboard.
            </p>
          </div>
        </div>

        {appUser ? (
          <div className="account-box">
            <strong>{appUser.name || appUser.email}</strong>
            <small>{appUser.email || `Requires @${allowedEmailDomain} email`}</small>
            <button className="button subtle" type="button" onClick={onSignOut}>
              Sign out
            </button>
          </div>
        ) : null}
      </header>

      {children}
    </main>
  );
}
