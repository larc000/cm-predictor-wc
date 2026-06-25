import { UserLocationFlag } from '@/components/users/UserLocationFlag';
import type { MatchResultWinner } from '@/lib/types';

type MatchWinnersModalProps = {
  title: string;
  winners: MatchResultWinner[];
  onClose: () => void;
};

export function MatchWinnersModal({ title, winners, onClose }: MatchWinnersModalProps) {
  const groupedWinners = groupWinnersByScore(winners);

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
            <p>{winners.length} participants</p>
          </div>
          <button className="button subtle" type="button" onClick={onClose}>
            Close
          </button>
        </div>

        {winners.length === 0 ? (
          <div className="notice">There are no participants for this category.</div>
        ) : (
          <div className="match-winners-list">
            {groupedWinners.map((group) => (
              <section key={group.scoreKey} className="match-winner-score-group">
                <div className="match-winner-score-group-heading">
                  <span>Prediction</span>
                  <strong>{group.scoreLabel}</strong>
                </div>
                {group.winners.map((winner) => (
                  <article key={`${winner.match_id}-${winner.user_id || winner.email}`} className="match-winner-row">
                    <div>
                      <div className="ranking-participant-name">
                        <UserLocationFlag timezone={getUserLocation(winner)} />
                        <strong>{winner.name || winner.email || 'No name'}</strong>
                      </div>
                    </div>
                  </article>
                ))}
              </section>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function groupWinnersByScore(winners: MatchResultWinner[]) {
  const groups = new Map<string, MatchResultWinner[]>();

  winners.forEach((winner) => {
    const scoreKey = getScoreKey(winner);
    groups.set(scoreKey, [...(groups.get(scoreKey) || []), winner]);
  });

  return Array.from(groups.entries())
    .sort(([scoreKeyA], [scoreKeyB]) => compareScoreKeys(scoreKeyA, scoreKeyB))
    .map(([scoreKey, groupWinners]) => ({
      scoreKey,
      scoreLabel: formatScoreKey(scoreKey),
      winners: groupWinners.sort((a, b) =>
        (a.name || a.email || '').localeCompare(b.name || b.email || '')
      )
    }));
}

function getScoreKey(winner: MatchResultWinner) {
  const scoreA = winner.pred_score_a ?? -1;
  const scoreB = winner.pred_score_b ?? -1;

  return `${scoreA}:${scoreB}`;
}

function compareScoreKeys(scoreKeyA: string, scoreKeyB: string) {
  const [scoreA1, scoreB1] = scoreKeyA.split(':').map(Number);
  const [scoreA2, scoreB2] = scoreKeyB.split(':').map(Number);

  if (scoreA1 !== scoreA2) {
    return scoreA1 - scoreA2;
  }

  return scoreB1 - scoreB2;
}

function formatScoreKey(scoreKey: string) {
  const [scoreA, scoreB] = scoreKey.split(':');

  if (scoreA === '-1' || scoreB === '-1') {
    return '-';
  }

  return `${scoreA} - ${scoreB}`;
}

function getUserLocation(winner: MatchResultWinner) {
  return winner.timezone || winner.location || null;
}
