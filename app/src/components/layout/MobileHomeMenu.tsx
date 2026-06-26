import { MainNav } from './MainNav';
import type { AppUser } from '@/lib/types';

type MobileHomeMenuProps = {
  appUser: AppUser;
  points: number;
  leaderboardPosition: number | null;
  totalParticipants: number;
  onSignOut: () => void;
};

export function MobileHomeMenu({
  appUser,
  points,
  leaderboardPosition,
  totalParticipants,
  onSignOut
}: MobileHomeMenuProps) {
  return (
    <section className="mobile-home-menu" aria-label="Main menu">
      <div className="mobile-home-header">
        <div className="mobile-home-title">
          <span aria-hidden="true" />
          <strong>World Cup 2026</strong>
        </div>
        <button className="mobile-home-signout" type="button" aria-label="Sign out" onClick={onSignOut}>
          ↪
        </button>
      </div>

      <p className="mobile-home-greeting">Good Luck, {getDisplayName(appUser)} 👋</p>

      <MainNav />

      <div className="mobile-home-rank">
        {leaderboardPosition && totalParticipants > 0
          ? `Score: ${points} pts, rank #${leaderboardPosition}`
          : `Score: ${points} pts, rank pending`}
      </div>
    </section>
  );
}

function getDisplayName(appUser: AppUser) {
  const name = appUser.name || appUser.email.split('@')[0];
  return name.trim().split(/\s+/)[0] || 'Player';
}
