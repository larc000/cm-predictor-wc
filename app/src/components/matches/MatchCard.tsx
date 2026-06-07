import Image from 'next/image';
import { formatMatchDate, getStageLabel } from '@/lib/domain';
import { COUNTRY_CODES } from '@/lib/countries';
import type { MatchWithPrediction, ScoreDraft } from '@/lib/types';

type MatchCardProps = {
  match: MatchWithPrediction;
  draft: ScoreDraft;
  editing: boolean;
  saving: boolean;
  timezone: string;
  onDraftChange: (matchId: string, side: 'a' | 'b', value: string) => void;
  onSubmitPrediction: (match: MatchWithPrediction) => void;
  onEditPrediction: (match: MatchWithPrediction) => void;
  onCancelEdit: (match: MatchWithPrediction) => void;
};

export function MatchCard({
  match,
  draft,
  editing,
  saving,
  timezone,
  onDraftChange,
  onSubmitPrediction,
  onEditPrediction,
  onCancelEdit
}: MatchCardProps) {
  const saved = match.hasPrediction;
  const inputDisabled = !match.canEdit || (saved && !editing);
  const normalizedStatus = match.status.toLowerCase();

  const statusClass =
    normalizedStatus === 'open'
      ? 'status-open'
      : normalizedStatus === 'final'
        ? 'status-final'
        : normalizedStatus === 'pending_teams'
          ? 'status-pending'
          : 'status-closed';
  const pointsLabel = !saved
    ? 'Sin pronóstico'
    : normalizedStatus === 'final'
      ? `Puntos: ${match.myPoints || 0}`
      : 'Puntos pendientes';

  return (
    <article className="match">
      <div className="match-header">
        <div className="match-heading">
          <div className="match-stage">
            {getStageLabel(match.stage)}
            {match.group_name ? ` - Grupo ${match.group_name}` : ''}
          </div>

          <div className="teams">
            {match.team_a} vs {match.team_b}
          </div>
          <div className="date">Fecha: {formatMatchDate(match.date_time, timezone)}</div>
        </div>
        <div>
        <span className="points-chip result-points-chip">{pointsLabel}</span>
        <span className={`status-chip ${statusClass}`}>{getStatusLabel(match.status)}</span>
        </div>
      </div>

      <div className="match-main">
        <div className="prediction-row">
          <div className="score-box">
            <label>{match.team_a}</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              value={draft.a}
              disabled={inputDisabled}
              onChange={(event) => onDraftChange(match.match_id, 'a', onlyDigits(event.target.value))}
            />
          </div>

          <div className="separator">-</div>

          <div className="score-box">
            <label>{match.team_b}</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              value={draft.b}
              disabled={inputDisabled}
              onChange={(event) => onDraftChange(match.match_id, 'b', onlyDigits(event.target.value))}
            />
          </div>

          <div className="actions">
            {!saved || editing ? (
              <button
                className="button"
                type="button"
                disabled={!match.canEdit || saving}
                onClick={() => onSubmitPrediction(match)}
              >
                {saving ? 'Guardando...' : saved ? 'Guardar cambios' : 'Guardar'}
              </button>
            ) : null}

            {saved && match.canEdit && !editing ? (
              <button className="button secondary" type="button" onClick={() => onEditPrediction(match)}>
                Editar
              </button>
            ) : null}

            {saved && editing ? (
              <button className="button secondary" type="button" onClick={() => onCancelEdit(match)}>
                Cancelar
              </button>
            ) : null}

            {saved && !match.canEdit ? (
              <button className="button" type="button" disabled>
                Guardado
              </button>
            ) : null}
          </div>
        </div>

        {!match.canEdit ? <div className="match-lock-message">{match.lockReason}</div> : null}
      </div>

      <FinalResultColumn match={match} pointsLabel={pointsLabel} />
    </article>
  );
}

function FinalResultColumn({ match, pointsLabel }: { match: MatchWithPrediction; pointsLabel: string }) {
  const isFinal = match.status.toLowerCase() === 'final';
  const hasFinalScore = isFinal && match.score_a !== null && match.score_b !== null;

  return (
    <aside className={`match-result-panel ${hasFinalScore ? 'is-final' : 'is-pending'}`}>
      <div>
        <div className="match-result-kicker">
          {hasFinalScore ? 'Resultado final' : 'Resultado pendiente'}
        </div>
        <div className="match-result-copy">
          {hasFinalScore ? 'Marcador oficial del partido' : 'Se actualizará cuando el partido finalice'}
        </div>
      </div>

      <div className="result-scoreboard" aria-label="Resultado del partido">
        <ResultTeamRow teamName={match.team_a} score={hasFinalScore ? match.score_a : null} />
        <ResultTeamRow teamName={match.team_b} score={hasFinalScore ? match.score_b : null} />
      </div>

    </aside>
  );
}

function ResultTeamRow({ teamName, score }: { teamName: string; score: number | null }) {
  return (
    <div className="result-team-row">
      <TeamFlag teamName={teamName} />
      <span className="result-team-name">{teamName}</span>
      <strong className="result-team-score">{score ?? '-'}</strong>
    </div>
  );
}

function TeamFlag({ teamName }: { teamName: string }) {
  const code = getCountryCode(teamName);

  if (!code) {
    return (
      <span className="team-flag-placeholder" aria-hidden="true">
        {teamName.slice(0, 1)}
      </span>
    );
  }

  return (
    <Image
      className="team-flag"
      src={`/flags/${code}.svg`}
      alt={`Bandera de ${teamName}`}
      width={36}
      height={24}
    />
  );
}

function getCountryCode(teamName: string) {
  const normalizedTeamName = normalizeCountryName(teamName);
  const exactCode = COUNTRY_CODES[teamName];

  if (exactCode) {
    return exactCode;
  }

  return Object.entries(COUNTRY_CODES).find(
    ([countryName]) => normalizeCountryName(countryName) === normalizedTeamName
  )?.[1];
}

function normalizeCountryName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function getStatusLabel(status: string) {
  const value = status.toLowerCase();

  if (value === 'open') return 'Abierto';
  if (value === 'pending_teams') return 'Equipos por definir';
  if (value === 'final') return 'Final';
  return 'Cerrado';
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, '');
}
