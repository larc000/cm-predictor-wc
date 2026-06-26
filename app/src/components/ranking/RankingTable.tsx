'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { UserLocationFlag } from '@/components/users/UserLocationFlag';
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
    currentUserRow,
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
      currentUserRow,
      isCurrentUserInPreview: isCurrentUserInTopTen,
      shouldShowCurrentUserPreview: showCurrentUserPreview,
      shouldShowToggle: leaderboard.length > PREVIEW_LIMIT
    };
  }, [activeUserId, leaderboard, showFullRanking]);

  return (
    <section className="leaderboard-section">
      <div className="section-heading">
        <div>
          <h2>Leaderboard</h2>
          <p className="section-copy">Total points by participant.</p>
        </div>
        <div className="section-actions leaderboard-section-actions">
          <nav className="secondary-tabs leaderboard-secondary-tabs" aria-label="Leaderboard sections">
            <Link className="secondary-tab-button" href="/leaderboard/personalizado">
              Custom Leaderboard
            </Link>
            <Link className="secondary-tab-button" href="/leaderboard/tabla-rendimiento">
              Stats
            </Link>
            <Link className="secondary-tab-button" href="/leaderboard/todos-los-pronosticos">
              All predictions
            </Link>
            <button className="secondary-tab-button" type="button" disabled={loading} onClick={onRefresh}>
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </nav>
        </div>
      </div>

      {currentUserRow ? (
        <div className="mobile-leaderboard-rank-card">
          <div>
            <span>Your rank</span>
            <strong>#{currentUserRank}</strong>
            <small>of {leaderboard.length.toLocaleString()} players</small>
          </div>
          <b>{currentUserRow.row.points || 0} pts</b>
        </div>
      ) : null}

      <div className="leaderboard">
        {error ? (
          <div className="notice error">Could not load the leaderboard: {error}</div>
        ) : loading && leaderboard.length === 0 ? (
          <div className="notice">Loading leaderboard...</div>
        ) : leaderboard.length === 0 ? (
          <div className="notice">There are no participants in the leaderboard yet.</div>
        ) : (
          <div className="table-scroll">
            <table className="ranking-table leaderboard-table">
              <thead>
                <tr>
                  <th>Position</th>
                  <th>Participant</th>
                  <th className="points-cell">Points</th>
                </tr>
              </thead>
              <tbody>
                {displayRows.map(({ row, rank }) => renderRankingRow(row, rank, activeUserId))}
                {shouldShowCurrentUserPreview ? (
                  <>
                    <tr className="ranking-table-separator" aria-hidden="true">
                      <td colSpan={3}>...</td>
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
            {showFullRanking ? 'View Top 10' : 'View full table'}
          </button>
          {!showFullRanking && currentUserRank ? (
            <span className="leaderboard-preview-copy">
              {isCurrentUserInPreview ? 'Your position is in the Top 10.' : `Your current position is #${currentUserRank}.`}
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
            <div className="ranking-participant-name">
              <UserLocationFlag timezone={row.timezone} />
              <strong>{row.name || row.email}</strong>
            </div>
            <small>{row.email}</small>
          </div>
          {isActiveUser ? <span className="current-user-chip">You</span> : null}
        </div>
      </td>
      <td className="points-cell">
        <strong>{row.points || 0} pts</strong>
      </td>
    </tr>
  );
}
