import { formatMatchDate, getStageLabel } from '@/lib/domain';
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
        <div>
          <div className="match-stage">
            {getStageLabel(match.stage)}
            {match.group_name ? ` - Grupo ${match.group_name}` : ''}
          </div>

          <div className="teams">
            {match.team_a} vs {match.team_b}
          </div>
          <div className="date">Fecha: {formatMatchDate(match.date_time, timezone)}</div>
          <div className="match-meta">
            <span className={`status-chip ${statusClass}`}>{getStatusLabel(match.status)}</span>
            <span className="points-chip">{pointsLabel}</span>
          </div>
          {normalizedStatus === 'final' && match.score_a !== null && match.score_b !== null ? (
            <div className="match-note">
              Resultado final: {match.team_a} {match.score_a} - {match.score_b} {match.team_b}
            </div>
          ) : null}
        </div>
      </div>

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

      {!match.canEdit ? <div className="match-note">{match.lockReason}</div> : null}
    </article>
  );
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
