import Image from 'next/image';
import { formatMatchDate, getStageLabel } from '@/lib/domain';
import { COUNTRY_CODES } from '@/lib/countries';
import type {
  MatchResultStat,
  MatchWinnerType,
  MatchWithPrediction,
  PenaltyWinner,
  ScoreDraft
} from '@/lib/types';
import { MatchResultStats } from './MatchResultStats';

type MatchCardProps = {
  match: MatchWithPrediction;
  draft: ScoreDraft;
  editing: boolean;
  saving: boolean;
  resultStats?: MatchResultStat;
  timezone: string;
  onDraftChange: (matchId: string, side: 'a' | 'b', value: string) => void;
  onPenaltyWinnerChange: (matchId: string, penaltyWinner: PenaltyWinner) => void;
  onSubmitPrediction: (match: MatchWithPrediction) => void;
  onEditPrediction: (match: MatchWithPrediction) => void;
  onCancelEdit: (match: MatchWithPrediction) => void;
  onShowWinners: (matchId: string, winnerType: MatchWinnerType, title: string) => void;
};

export function MatchCard({
  match,
  draft,
  editing,
  saving,
  resultStats,
  timezone,
  onDraftChange,
  onPenaltyWinnerChange,
  onSubmitPrediction,
  onEditPrediction,
  onCancelEdit,
  onShowWinners
}: MatchCardProps) {
  const saved = match.hasPrediction;
  const inputDisabled = !match.canEdit || (saved && !editing);
  const normalizedStatus = match.status.toLowerCase();
  const isKnockoutMatch = isKnockoutStage(match.stage);
  const hasTiedDraftScore = draft.a !== '' && draft.b !== '' && Number(draft.a) === Number(draft.b);
  const showPenaltyWinnerSelector = isKnockoutMatch && hasTiedDraftScore;

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
            {match.stage === 'group'
              ? `Grupo ${match.group_name}`
              : `${getStageLabel(match.stage)}${match.group_name ? ` - Grupo ${match.group_name}` : ''}`
            }
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

        {showPenaltyWinnerSelector ? (
          <div className="penalty-winner-field">
            <label htmlFor={`penalty_${match.match_id}`}>¿Quién gana por penales?</label>
            <select
              id={`penalty_${match.match_id}`}
              value={draft.penaltyWinner || ''}
              disabled={inputDisabled}
              onChange={(event) =>
                onPenaltyWinnerChange(match.match_id, normalizePenaltyWinner(event.target.value))
              }
            >
              <option value="">Seleccionar</option>
              <option value="team_a">{match.team_a}</option>
              <option value="team_b">{match.team_b}</option>
            </select>
          </div>
        ) : null}

        {!match.canEdit ? <div className="match-lock-message">{match.lockReason}</div> : null}
      </div>

      <FinalResultColumn match={match} pointsLabel={pointsLabel} />

      {normalizedStatus === 'final' ? (
        <MatchResultStats stats={resultStats} onShowWinners={onShowWinners} />
      ) : null}
    </article>
  );
}

function FinalResultColumn({ match, pointsLabel }: { match: MatchWithPrediction; pointsLabel: string }) {
  const isFinal = match.status.toLowerCase() === 'final';
  const hasFinalScore = isFinal && match.score_a !== null && match.score_b !== null;
  const showPenaltyWinner = hasFinalScore && isKnockoutStage(match.stage) && Boolean(match.penalty_winner);

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
        <ResultTeamRow
          teamName={match.team_a}
          score={hasFinalScore ? match.score_a : null}
          wonOnPenalties={showPenaltyWinner && match.penalty_winner === 'team_a'}
        />
        <ResultTeamRow
          teamName={match.team_b}
          score={hasFinalScore ? match.score_b : null}
          wonOnPenalties={showPenaltyWinner && match.penalty_winner === 'team_b'}
        />
      </div>

    </aside>
  );
}

function ResultTeamRow({
  teamName,
  score,
  wonOnPenalties = false
}: {
  teamName: string;
  score: number | null;
  wonOnPenalties?: boolean;
}) {
  return (
    <div className="result-team-row">
      <TeamFlag teamName={teamName} />
      <span className="result-team-name">
        {teamName}
        {wonOnPenalties ? <span className="penalty-winner-mark">*</span> : null}
      </span>
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

function isKnockoutStage(stage?: string | null) {
  const value = String(stage || '').toLowerCase();

  return value !== '' && value !== 'group';
}

function normalizePenaltyWinner(value: string): PenaltyWinner {
  if (value === 'team_a' || value === 'team_b') {
    return value;
  }

  return null;
}
