import Image from 'next/image';
import { MainNav } from './MainNav';
import logoutIcon from '@/assets/icon-logout.svg';
import brandLogo from '@/assets/new_logo.png';
import type { AppUser } from '@/lib/types';

type MobileHomeMenuProps = {
  appUser: AppUser;
  points: number;
  leaderboardPosition: number | null;
  onSignOut: () => void;
};

export function MobileHomeMenu({
  appUser,
  points,
  leaderboardPosition,
  onSignOut
}: MobileHomeMenuProps) {
  return (
    <section className="mobile-home-menu" aria-label="Main menu">
      <div className="mobile-home-header">
        <div className="mobile-home-brand">
          <Image
            className="brand-logo-image mobile-home-logo"
            src={brandLogo}
            alt="World Cup Predictor CM"
            sizes="calc(100vw - 48px)"
            priority
          />
        </div>
      </div>

      <div className="mobile-home-greeting-row">
        <p className="mobile-home-greeting">Good Luck, {getDisplayName(appUser)} 👋</p>
        <button className="mobile-home-signout" type="button" aria-label="Sign out" onClick={onSignOut}>
          <span>Sign out</span>
          <Image className="mobile-home-signout-icon" src={logoutIcon} alt="" width={26} height={26} />
        </button>
      </div>

      <MainNav />

      <div className="mobile-home-rank">
        <span className="mobile-home-rank-label">
          Your score: <strong>{points} pts</strong>
        </span>
        <span className="mobile-home-rank-position">
          <span>Position &nbsp;</span>
          <strong>{leaderboardPosition ? `# ${leaderboardPosition}` : '-'}</strong>
        </span>
      </div>
    </section>
  );
}

function getDisplayName(appUser: AppUser) {
  const name = appUser.name || appUser.email.split('@')[0];
  return name.trim().split(/\s+/)[0] || 'Player';
}
