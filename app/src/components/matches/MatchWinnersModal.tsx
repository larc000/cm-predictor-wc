import { UserLocationFlag } from '@/components/users/UserLocationFlag';
import type { MatchResultWinner } from '@/lib/types';

type MatchWinnersModalProps = {
  title: string;
  winners: MatchResultWinner[];
  onClose: () => void;
};

export function MatchWinnersModal({ title, winners, onClose }: MatchWinnersModalProps) {
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="modal-panel match-winners-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="match-winners-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h3 id="match-winners-modal-title">{title}</h3>
            <p>{winners.length} participantes</p>
          </div>
          <button className="button subtle" type="button" onClick={onClose}>
            Cerrar
          </button>
        </div>

        {winners.length === 0 ? (
          <div className="notice">No hay participantes para esta categoría.</div>
        ) : (
          <div className="match-winners-list">
            {winners.map((winner) => (
              <article key={`${winner.match_id}-${winner.user_id || winner.email}`} className="match-winner-row">
                <div>
                  <div className="ranking-participant-name">
                    <UserLocationFlag timezone={getUserLocation(winner)} />
                    <strong>{winner.name || winner.email || 'Sin nombre'}</strong>
                  </div>
                </div>
                <div className="match-winner-score">
                  <span>Pronóstico</span>
                  <strong>
                    {winner.pred_score_a ?? '-'} - {winner.pred_score_b ?? '-'}
                  </strong>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function getUserLocation(winner: MatchResultWinner) {
  return winner.timezone || winner.location || null;
}

function getLocationLabel(winner: MatchResultWinner) {
  const location = getUserLocation(winner);

  if (!location) {
    return '';
  }

  if (location === 'America/Costa_Rica' || location.toLowerCase() === 'cr') {
    return 'Costa Rica';
  }

  if (location === 'America/Bogota' || location.toLowerCase() === 'co') {
    return 'Colombia';
  }

  return location;
}
