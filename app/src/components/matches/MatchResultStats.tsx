import type { MatchResultStat, MatchWinnerType } from '@/lib/types';

type MatchResultStatsProps = {
  stats?: MatchResultStat;
  onShowWinners: (matchId: string, winnerType: MatchWinnerType, title: string) => void;
};

export function MatchResultStats({ stats, onShowWinners }: MatchResultStatsProps) {
  if (!stats) {
    return null;
  }

  const penaltiesCount = Number(stats.penalties_count) || 0;

  return (
    <section className="match-result-stats" aria-label="Match hits">
      <h4>Match hits</h4>
      <div className="match-result-stats-grid">
        <StatItem
          label="Result"
          count={stats.result_only_count}
          percentage={stats.result_only_pct}
          matchId={stats.match_id}
          winnerType="result_only"
          modalTitle="Correct result"
          onShowWinners={onShowWinners}
        />
        <StatItem
          label="Exact score"
          count={stats.exact_score_count}
          percentage={stats.exact_score_pct}
          matchId={stats.match_id}
          winnerType="exact_score"
          modalTitle="Correct exact score"
          onShowWinners={onShowWinners}
        />
        {penaltiesCount > 0 ? (
          <StatItem
            label="Penalties"
            count={stats.penalties_count}
            percentage={stats.penalties_pct}
            matchId={stats.match_id}
            winnerType="penalties"
            modalTitle="Correct score and penalties"
            onShowWinners={onShowWinners}
          />
        ) : null}
      </div>
    </section>
  );
}

function StatItem({
  label,
  count,
  percentage,
  matchId,
  winnerType,
  modalTitle,
  onShowWinners
}: {
  label: string;
  count: number | null;
  percentage: number | null;
  matchId: string;
  winnerType: MatchWinnerType;
  modalTitle: string;
  onShowWinners: (matchId: string, winnerType: MatchWinnerType, title: string) => void;
}) {
  const normalizedCount = Number(count) || 0;

  return (
    <p>
      {label}:{' '}
      {normalizedCount > 0 ? (
        <button
          className="match-result-stats-link"
          type="button"
          onClick={() => onShowWinners(matchId, winnerType, modalTitle)}
        >
          {normalizedCount} people
        </button>
      ) : (
        <strong>0 people</strong>
      )}{' '}
      ({formatPercentage(percentage)})
    </p>
  );
}

function formatPercentage(value: number | null) {
  const percentage = Number(value);

  if (!Number.isFinite(percentage)) {
    return '0%';
  }

  return `${Math.round(percentage)}%`;
}
