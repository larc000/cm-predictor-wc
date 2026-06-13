import type { MatchResultStat } from '@/lib/types';

type MatchResultStatsProps = {
  stats?: MatchResultStat;
};

export function MatchResultStats({ stats }: MatchResultStatsProps) {
  if (!stats) {
    return null;
  }

  const penaltiesCount = Number(stats.penalties_count) || 0;

  return (
    <section className="match-result-stats" aria-label="Aciertos de este partido">
      <h4>Estadísticas</h4>
      <div className="match-result-stats-grid">
        <StatItem
          label="Solo Resultado (1 pt)"
          count={stats.result_only_count}
          percentage={stats.result_only_pct}
        />
        <StatItem
          label="Resultado + marcador (3pts)"
          count={stats.exact_score_count}
          percentage={stats.exact_score_pct}
        />
        {penaltiesCount > 0 ? (
          <StatItem
            label="Resultado + marcador + penales (4pts)"
            count={stats.penalties_count}
            percentage={stats.penalties_pct}
          />
        ) : null}
      </div>
    </section>
  );
}

function StatItem({
  label,
  count,
  percentage
}: {
  label: string;
  count: number | null;
  percentage: number | null;
}) {
  return (
    <p>
      {label}: <strong>{Number(count) || 0} personas</strong> ({formatPercentage(percentage)})
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
