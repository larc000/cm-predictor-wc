'use client';

import Link from 'next/link';
import { UserLocationFlag } from '@/components/users/UserLocationFlag';
import type { PerformanceReportRow } from '@/lib/types';

type PerformanceTableProps = {
  rows: PerformanceReportRow[];
  loading: boolean;
  error: string;
  activeUserId: string;
  activeUserEmail: string;
  onRefresh: () => void;
};

export function PerformanceTable({
  rows,
  loading,
  error,
  activeUserId,
  activeUserEmail,
  onRefresh
}: PerformanceTableProps) {
  return (
    <section>
      <div className="section-heading">
        <div>
          <h2>Tabla de rendimiento</h2>
          <p className="section-copy">Detalle de puntos y aciertos por participante.</p>
        </div>
        <div className="section-actions">
          <Link className="button subtle" href="/leaderboard">
            Volver
          </Link>
          <button className="button subtle" type="button" disabled={loading} onClick={onRefresh}>
            {loading ? 'Cargando...' : 'Actualizar'}
          </button>
        </div>
      </div>

      <div className="leaderboard">
        {error ? (
          <div className="notice error">No se pudo cargar la tabla de rendimiento: {error}</div>
        ) : loading && rows.length === 0 ? (
          <div className="notice">Cargando tabla de rendimiento...</div>
        ) : rows.length === 0 ? (
          <div className="notice">Aún no hay partidos finalizados para generar estadísticas.</div>
        ) : (
          <div className="table-scroll">
            <table className="ranking-table performance-table">
              <colgroup>
                <col className="performance-position-column" />
                <col className="performance-participant-column" />
                <col className="performance-points-column" />
                <col />
                <col />
                <col />
              </colgroup>
              <thead>
                <tr>
                  <th>Posición</th>
                  <th>Participante</th>
                  <th className="points-cell">Puntos</th>
                  <th className="points-cell performance-metric-heading">
                    <span>Solo Resultado</span>
                    <small>(1 pt)</small>
                  </th>
                  <th className="points-cell performance-metric-heading">
                    <span>Resultado + marcador</span>
                    <small>(3pts)</small>
                  </th>
                  <th className="points-cell performance-metric-heading">
                    <span>Resultado + marcador</span>
                    <small>+ penales (4pts)</small>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <PerformanceRow
                    key={row.user_id || row.email || row.position}
                    row={row}
                    activeUserId={activeUserId}
                    activeUserEmail={activeUserEmail}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

function PerformanceRow({
  row,
  activeUserId,
  activeUserEmail
}: {
  row: PerformanceReportRow;
  activeUserId: string;
  activeUserEmail: string;
}) {
  const isActiveUser =
    Boolean(activeUserId && row.user_id === activeUserId) ||
    Boolean(activeUserEmail && row.email?.toLowerCase() === activeUserEmail.toLowerCase());

  return (
    <tr className={isActiveUser ? 'ranking-table-current-user' : undefined}>
      <td>{row.position}</td>
      <td>
        <div className="ranking-participant">
          <div>
            <div className="ranking-participant-name">
              <UserLocationFlag timezone={getUserLocation(row)} />
              <strong>{row.participant || row.name || row.email || 'Sin nombre'}</strong>
            </div>
            {row.email ? (
              <>
                <br />
                <small>{row.email}</small>
              </>
            ) : null}
          </div>
        </div>
      </td>
      <td className="points-cell">{row.total_points || 0}</td>
      <td className="points-cell">{row.result_count || 0}</td>
      <td className="points-cell">{row.exact_score_count || 0}</td>
      <td className="points-cell">{row.penalties_count || 0}</td>
    </tr>
  );
}

function getUserLocation(row: PerformanceReportRow) {
  return row.timezone || row.location || row.country || row.country_code || null;
}
