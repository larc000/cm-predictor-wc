'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { formatMatchDate } from '@/lib/domain';
import type { PredictionAuditRow } from '@/lib/types';

const MATCH_GROUPS_PER_PAGE = 8;

type PredictionAuditReportProps = {
  rows: PredictionAuditRow[];
  loading: boolean;
  error: string;
  timezone: string;
  onRefresh: () => void;
};

type PredictionAuditGroup = {
  matchId: string;
  match: PredictionAuditRow;
  predictions: PredictionAuditRow[];
};

export function PredictionAuditReport({
  rows,
  loading,
  error,
  timezone,
  onRefresh
}: PredictionAuditReportProps) {
  const [visibleGroupCount, setVisibleGroupCount] = useState(MATCH_GROUPS_PER_PAGE);
  const [search, setSearch] = useState('');
  const filteredRows = useMemo(() => filterRows(rows, search), [rows, search]);
  const groupedRows = useMemo(() => groupPredictionRows(filteredRows), [filteredRows]);
  const visibleGroups = groupedRows.slice(0, visibleGroupCount);
  const hasMoreGroups = visibleGroupCount < groupedRows.length;

  return (
    <section>
      <div className="section-heading">
        <div>
          <h2>Todos los pronósticos</h2>
          <p className="section-copy">Reporte de pronósticos de todos los usuarios agrupado por partido. </p>
          <p className="section-copy">  Se muestran una vez el partido esté en estado Cerrado o Final.</p>
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

      <div className="prediction-audit-filters">
        <label htmlFor="prediction-audit-search">Buscar</label>
        <input
          id="prediction-audit-search"
          type="search"
          placeholder="Nombre, correo o país"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setVisibleGroupCount(MATCH_GROUPS_PER_PAGE);
          }}
        />
      </div>

      <div className="leaderboard prediction-audit">
        {error ? (
          <div className="notice error">No se pudo cargar el reporte: {error}</div>
        ) : loading && rows.length === 0 ? (
          <div className="notice">Cargando pronósticos...</div>
        ) : rows.length === 0 ? (
          <div className="notice">Todavía no hay pronósticos registrados.</div>
        ) : filteredRows.length === 0 ? (
          <div className="notice">No hay pronósticos para esa búsqueda.</div>
        ) : (
          <div className="table-scroll">
            <table className="ranking-table prediction-audit-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Equipo A</th>
                  <th>Equipo B</th>
                  <th>Usuario</th>
                  <th>Fecha enviada</th>
                  <th className="points-cell">Pts</th>
                </tr>
              </thead>
              <tbody>
                {visibleGroups.map((group) => (
                  <MatchPredictionRows key={group.matchId} group={group} timezone={timezone} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!error && groupedRows.length > MATCH_GROUPS_PER_PAGE ? (
        <div className="leaderboard-actions prediction-audit-actions">
          {hasMoreGroups ? (
            <button
              className="button subtle"
              type="button"
              onClick={() =>
                setVisibleGroupCount((current) =>
                  Math.min(current + MATCH_GROUPS_PER_PAGE, groupedRows.length)
                )
              }
            >
              Cargar más
            </button>
          ) : null}
          <span className="leaderboard-preview-copy">
            Mostrando {visibleGroups.length} de {groupedRows.length} partidos.
          </span>
        </div>
      ) : null}
    </section>
  );
}

function MatchPredictionRows({
  group,
  timezone
}: {
  group: PredictionAuditGroup;
  timezone: string;
}) {
  const { match, predictions } = group;

  return (
    <>
      <tr className="prediction-audit-match-row">
        <td>{formatMatchDate(match.date_time, timezone)}</td>
        <td>
          <TeamResult teamName={match.team_a} score={match.score_a} />
        </td>
        <td>
          <TeamResult teamName={match.team_b} score={match.score_b} />
        </td>
        <td aria-label="Usuario" />
        <td aria-label="Fecha enviada" />
        <td className="points-cell">
          <span className={`status-chip ${getStatusClass(match.status)}`}>{getStatusLabel(match.status)}</span>
        </td>
      </tr>
      {predictions.map((prediction) => (
        <tr key={`${prediction.match_id}-${prediction.user_id}`}>
          <td aria-label="Fecha" />
          <td className="prediction-score-cell">{prediction.pred_score_a}</td>
          <td className="prediction-score-cell">{prediction.pred_score_b}</td>
          <td>
            <strong>{prediction.user_name || prediction.user_email}</strong>
            <br />
            <small>{prediction.user_email}</small>
          </td>
          <td>{formatMatchDate(prediction.submitted_at, timezone)}</td>
          <td className="points-cell">{prediction.points || 0}</td>
        </tr>
      ))}
    </>
  );
}

function groupPredictionRows(rows: PredictionAuditRow[]) {
  const groups = new Map<string, PredictionAuditGroup>();

  rows.forEach((row) => {
    const group = groups.get(row.match_id);

    if (group) {
      group.predictions.push(row);
      return;
    }

    groups.set(row.match_id, {
      matchId: row.match_id,
      match: row,
      predictions: [row]
    });
  });

  return Array.from(groups.values()).sort(
    (a, b) => new Date(b.match.date_time).getTime() - new Date(a.match.date_time).getTime()
  );
}

function filterRows(rows: PredictionAuditRow[], search: string) {
  const normalizedSearch = search.trim().toLowerCase();

  if (!normalizedSearch) {
    return rows;
  }

  return rows.filter((row) => {
    const name = String(row.user_name || '').toLowerCase();
    const email = row.user_email.toLowerCase();
    const teamA = row.team_a.toLowerCase();
    const teamB = row.team_b.toLowerCase();

    return (
      name.includes(normalizedSearch) ||
      email.includes(normalizedSearch) ||
      teamA.includes(normalizedSearch) ||
      teamB.includes(normalizedSearch)
    );
  });
}

function TeamResult({ teamName, score }: { teamName: string; score: number | null }) {
  return (
    <div className="prediction-audit-team-result">
      <span>{teamName}</span>
      <strong>{score === null ? '-' : score}</strong>
    </div>
  );
}

function getStatusLabel(status: string) {
  const normalizedStatus = status.toLowerCase();

  if (normalizedStatus === 'open') return 'Abierto';
  if (normalizedStatus === 'final') return 'Final';
  if (normalizedStatus === 'pending_teams') return 'Pendiente';

  return 'Cerrado';
}

function getStatusClass(status: string) {
  const normalizedStatus = status.toLowerCase();

  if (normalizedStatus === 'open') return 'status-open';
  if (normalizedStatus === 'final') return 'status-final';
  if (normalizedStatus === 'pending_teams') return 'status-pending';

  return 'status-closed';
}
