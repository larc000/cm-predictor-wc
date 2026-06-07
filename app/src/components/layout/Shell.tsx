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

        <div className="account-box">
          <strong>{appUser?.name || (appUser ? appUser.email : 'Sin sesión')}</strong>
          <small>{appUser?.email || `Requiere correo @${allowedEmailDomain}`}</small>
          {appUser ? (
            <button className="button subtle" type="button" onClick={onSignOut}>
              Salir
            </button>
          ) : null}
        </div>
      </header>

      {children}
    </main>
  );
}
