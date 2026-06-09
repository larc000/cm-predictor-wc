import Image from 'next/image';
import type { ReactNode } from 'react';
import quinelaLogo from '@/assets/QuinelaLogo.png';
import type { AppUser } from '@/lib/types';

type ShellProps = {
  appUser: AppUser | null;
  allowedEmailDomain: string;
  onSignOut: () => void;
  children: ReactNode;
};

export function Shell({ appUser, allowedEmailDomain, onSignOut, children }: ShellProps) {
  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <Image
            className="brand-mark"
            src={quinelaLogo}
            alt="Quiniela CM LATAM"
            sizes="160px"
            priority
          />
          <div>
            <h1>Copa Mundial FIFA 2026</h1>
            <p className="subtitle">
              Pronostica el resultado, suma puntos y demuestra quién es el verdadero experto del
              Mundial
            </p>
          </div>
        </div>

        {appUser ? (
          <div className="account-box">
            <strong>{appUser.name || appUser.email}</strong>
            <small>{appUser.email || `Requiere correo @${allowedEmailDomain}`}</small>
            <button className="button subtle" type="button" onClick={onSignOut}>
              Salir
            </button>
          </div>
        ) : null}
      </header>

      {children}
    </main>
  );
}
