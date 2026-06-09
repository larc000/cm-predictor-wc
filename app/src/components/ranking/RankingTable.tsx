'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { getLocationFromTimezone } from '@/lib/domain';
import type { LeaderboardRow } from '@/lib/types';

const PREVIEW_LIMIT = 10;

type RankingTableProps = {
  leaderboard: LeaderboardRow[];
  loading: boolean;
  error: string;
  activeUserId: string;
  onRefresh: () => void;
};

type RankingDisplayRow = {
  row: LeaderboardRow;
  rank: number;
};

export function RankingTable({ leaderboard, loading, error, activeUserId, onRefresh }: RankingTableProps) {
  const [showFullRanking, setShowFullRanking] = useState(false);

  const {
    displayRows,
    currentUserRank,
    isCurrentUserInPreview,
    shouldShowCurrentUserPreview,
    shouldShowToggle
  } = useMemo(() => {
    const rowsWithRank = leaderboard.map((row, index) => ({
      row,
      rank: index + 1
    }));
    const topTenRows = rowsWithRank.slice(0, PREVIEW_LIMIT);
    const currentUserIndex = leaderboard.findIndex((row) => row.user_id === activeUserId);
    const currentUserRow = currentUserIndex === -1 ? null : rowsWithRank[currentUserIndex];
    const isCurrentUserInTopTen = currentUserIndex >= 0 && currentUserIndex < PREVIEW_LIMIT;
    const showCurrentUserPreview = !showFullRanking && !!currentUserRow && !isCurrentUserInTopTen;

    return {
      displayRows: showFullRanking ? rowsWithRank : topTenRows,
      currentUserRank: currentUserRow?.rank ?? null,
      isCurrentUserInPreview: isCurrentUserInTopTen,
      shouldShowCurrentUserPreview: showCurrentUserPreview,
      shouldShowToggle: leaderboard.length > PREVIEW_LIMIT
    };
  }, [activeUserId, leaderboard, showFullRanking]);

  return (
    <section>
      <div className="section-heading">
        <div>
          <h2>Leaderboard</h2>
          <p className="section-copy">Puntos acumulados por participante.</p>
        </div>
        <div className="section-actions">
          <Link className="button subtle" href="/leaderboard/todos-los-pronosticos">
            Todos los pronósticos
          </Link>
          <button className="button subtle" type="button" disabled={loading} onClick={onRefresh}>
            {loading ? 'Cargando...' : 'Actualizar'}
          </button>
        </div>
      </div>

      <div className="leaderboard">
        {error ? (
          <div className="notice error">No se pudo cargar el ranking: {error}</div>
        ) : loading && leaderboard.length === 0 ? (
          <div className="notice">Cargando ranking...</div>
        ) : leaderboard.length === 0 ? (
          <div className="notice">Todavía no hay participantes en el ranking.</div>
        ) : (
          <div className="table-scroll">
            <table className="ranking-table leaderboard-table">
              <thead>
                <tr>
                  <th>Posición</th>
                  <th>Participante</th>
                  <th>Ubicación</th>
                  <th className="points-cell">Puntos</th>
                </tr>
              </thead>
              <tbody>
                {displayRows.map(({ row, rank }) => renderRankingRow(row, rank, activeUserId))}
                {shouldShowCurrentUserPreview ? (
                  <>
                    <tr className="ranking-table-separator" aria-hidden="true">
                      <td colSpan={4}>...</td>
                    </tr>
                    {renderRankingRow(
                      leaderboard[(currentUserRank || 1) - 1],
                      currentUserRank || leaderboard.length,
                      activeUserId
                    )}
                  </>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!error && leaderboard.length > 0 && shouldShowToggle ? (
        <div className="leaderboard-actions">
          <button className="button subtle" type="button" onClick={() => setShowFullRanking((current) => !current)}>
            {showFullRanking ? 'Ver Top 10' : 'Ver tabla completa'}
          </button>
          {!showFullRanking && currentUserRank ? (
            <span className="leaderboard-preview-copy">
              {isCurrentUserInPreview ? 'Tu posición está en el Top 10.' : `Tu posición actual es #${currentUserRank}.`}
            </span>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function renderRankingRow(row: LeaderboardRow, rank: number, activeUserId: string) {
  const isActiveUser = row.user_id === activeUserId;

  return (
    <tr
      key={row.user_id}
      className={isActiveUser ? 'ranking-table-current-user' : undefined}
      aria-current={isActiveUser ? 'true' : undefined}
    >
      <td>{rank}</td>
      <td>
        <div className="ranking-participant">
          <div>
            <strong>{row.name || row.email}</strong>
            <br />
            <small>{row.email}</small>
          </div>
          {isActiveUser ? <span className="current-user-chip">Tú</span> : null}
        </div>
      </td>
      <td className="ranking-location-cell">{getLocationFromTimezone(row.timezone)}</td>
      <td className="points-cell">{row.points || 0}</td>
    </tr>
  );
}
