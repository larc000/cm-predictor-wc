import type { LeaderboardRow } from '@/lib/types';

type RankingTableProps = {
  leaderboard: LeaderboardRow[];
  loading: boolean;
  error: string;
  onRefresh: () => void;
};

export function RankingTable({ leaderboard, loading, error, onRefresh }: RankingTableProps) {
  return (
    <section>
      <div className="section-heading">
        <div>
          <h2>Leaderboard</h2>
          <p className="section-copy">Puntos acumulados por participante.</p>
        </div>
        <button className="button subtle" type="button" disabled={loading} onClick={onRefresh}>
          {loading ? 'Cargando...' : 'Actualizar'}
        </button>
      </div>

      <div className="leaderboard">
        {error ? (
          <div className="notice error">No se pudo cargar el ranking: {error}</div>
        ) : loading && leaderboard.length === 0 ? (
          <div className="notice">Cargando ranking...</div>
        ) : leaderboard.length === 0 ? (
          <div className="notice">Todavía no hay participantes en el ranking.</div>
        ) : (
          <table className="ranking-table">
            <thead>
              <tr>
                <th>Posición</th>
                <th>Participante</th>
                <th className="points-cell">Puntos</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((row, index) => (
                <tr key={row.user_id}>
                  <td>{index + 1}</td>
                  <td>
                    <strong>{row.name || row.email}</strong>
                    <br />
                    <small>{row.email}</small>
                  </td>
                  <td className="points-cell">{row.points || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
