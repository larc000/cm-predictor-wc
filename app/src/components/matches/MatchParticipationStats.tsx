import type { PendingMatchParticipation } from '@/lib/types';

type MatchParticipationStatsProps = {
  participation?: PendingMatchParticipation;
};

export function MatchParticipationStats({ participation }: MatchParticipationStatsProps) {
  if (!participation) {
    return null;
  }

  const predictionsSubmitted = Number(participation.predictions_submitted) || 0;
  const activeUsers = Number(participation.active_users) || 0;

  return (
    <section className="match-result-stats" aria-label="Participation">
      <h4>Participation</h4>
      <div className="match-result-stats-grid">
        <p>
          <strong>{predictionsSubmitted} of {activeUsers}</strong> participants have submitted predictions
        </p>
      </div>
    </section>
  );
}

function formatPercentage(value: number | null) {
  const percentage = Number(value);

  if (!Number.isFinite(percentage)) {
    return '0%';
  }

  return `${percentage.toFixed(1).replace(/\.0$/, '')}%`;
}
