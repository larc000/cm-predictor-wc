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
    <section className="match-result-stats" aria-label="Aciertos de este partido">
      <h4>Aciertos de este partido</h4>
      <div className="match-result-stats-grid">
        <StatItem
          label="Resultado"
          count={stats.result_only_count}
          percentage={stats.result_only_pct}
          matchId={stats.match_id}
          winnerType="result_only"
          modalTitle="Acertaron resultado"
          onShowWinners={onShowWinners}
        />
        <StatItem
          label="Marcador exacto"
          count={stats.exact_score_count}
          percentage={stats.exact_score_pct}
          matchId={stats.match_id}
          winnerType="exact_score"
          modalTitle="Acertaron marcador exacto"
          onShowWinners={onShowWinners}
        />
        {penaltiesCount > 0 ? (
          <StatItem
            label="Penales"
            count={stats.penalties_count}
            percentage={stats.penalties_pct}
            matchId={stats.match_id}
            winnerType="penalties"
            modalTitle="Acertaron marcador y penales"
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
          {normalizedCount} personas
        </button>
      ) : (
        <strong>0 personas</strong>
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
