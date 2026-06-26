import Image from 'next/image';
import { formatMatchDate, getStageLabel } from '@/lib/domain';
import { getCountryCode } from '@/lib/countries';
import type {
  MatchResultStat,
  MatchWinnerType,
  MatchWithPrediction,
  PenaltyWinner,
  PendingMatchParticipation,
  ScoreDraft
} from '@/lib/types';
import { MatchParticipationStats } from './MatchParticipationStats';
import { MatchResultStats } from './MatchResultStats';

type MatchCardProps = {
  match: MatchWithPrediction;
  draft: ScoreDraft;
  saving: boolean;
  resultStats?: MatchResultStat;
  participationStats?: PendingMatchParticipation;
  timezone: string;
  showResultPanel?: boolean;
  onDraftChange: (matchId: string, side: 'a' | 'b', value: string) => void;
  onPenaltyWinnerChange: (matchId: string, penaltyWinner: PenaltyWinner) => void;
  onSubmitPrediction: (match: MatchWithPrediction) => void;
  onShowWinners: (matchId: string, winnerType: MatchWinnerType, title: string) => void;
};

export function MatchCard({
  match,
  draft,
  saving,
  resultStats,
  participationStats,
  timezone,
  showResultPanel = true,
  onDraftChange,
  onPenaltyWinnerChange,
  onSubmitPrediction,
  onShowWinners
}: MatchCardProps) {
  const saved = match.hasPrediction;
  const inputDisabled = !match.canEdit || saving;
  const normalizedStatus = match.status.toLowerCase();
  const isPendingResult = normalizedStatus === 'open' || normalizedStatus === 'closed';
  const isKnockoutMatch = isKnockoutStage(match.stage);
  const hasTiedDraftScore = draft.a !== '' && draft.b !== '' && Number(draft.a) === Number(draft.b);
  const showPenaltyWinnerSelector = isKnockoutMatch && hasTiedDraftScore;
  const handlePredictionBlur = () => {
    if (inputDisabled || !shouldAutosavePrediction(match, draft)) {
      return;
    }

    onSubmitPrediction(match);
  };

  const statusClass =
    normalizedStatus === 'open'
      ? 'status-open'
      : normalizedStatus === 'final'
        ? 'status-final'
        : normalizedStatus === 'pending_teams'
          ? 'status-pending'
          : 'status-closed';
  const pointsLabel = !saved
    ? 'No prediction'
    : normalizedStatus === 'final'
      ? `Points: ${match.myPoints || 0}`
      : 'Pending points';

  return (
    <article className="match">
      <div className="match-header">
        <div className="match-heading">
          <div className="match-stage">
            {getStageLabel(match.stage)}
          </div>
          <div className="date">Date: {formatMatchDate(match.date_time, timezone)}</div>
          <div className="match-badges">
            <span className="points-chip result-points-chip">{pointsLabel}</span>
            <span className={`status-chip ${statusClass}`}>{getStatusLabel(match.status)}</span>
          </div>
        </div>
      </div>

      <div className="match-main">
        <div
          className="prediction-panel"
          onBlur={(event) => {
            const nextTarget = event.relatedTarget as Node | null;

            if (!nextTarget || !event.currentTarget.contains(nextTarget)) {
              handlePredictionBlur();
            }
          }}
        >
          <PredictionScoreboard
            match={match}
            draft={draft}
            inputDisabled={inputDisabled}
            onDraftChange={onDraftChange}
          />

          {showPenaltyWinnerSelector ? (
            <div className="penalty-winner-field">
              <label htmlFor={`penalty_${match.match_id}`}>Who wins on penalties?</label>
              <select
                id={`penalty_${match.match_id}`}
                value={draft.penaltyWinner || ''}
                disabled={inputDisabled}
                onChange={(event) =>
                  onPenaltyWinnerChange(match.match_id, normalizePenaltyWinner(event.target.value))
                }
              >
                <option value="">Select</option>
                <option value="team_a">{match.team_a}</option>
                <option value="team_b">{match.team_b}</option>
              </select>
            </div>
          ) : null}

          {!match.canEdit ? <div className="match-lock-message">{match.lockReason}</div> : null}
        </div>
      </div>

      {showResultPanel ? <FinalResultColumn match={match} /> : null}

      {normalizedStatus === 'final' ? (
        <MatchResultStats stats={resultStats} onShowWinners={onShowWinners} />
      ) : null}

      {isPendingResult ? <MatchParticipationStats participation={participationStats} /> : null}
    </article>
  );
}

function PredictionScoreboard({
  match,
  draft,
  inputDisabled,
  onDraftChange
}: {
  match: MatchWithPrediction;
  draft: ScoreDraft;
  inputDisabled: boolean;
  onDraftChange: (matchId: string, side: 'a' | 'b', value: string) => void;
}) {
  return (
    <div className="prediction-scoreboard" aria-label="Prediction">
      <TeamFlag teamName={match.team_a} />
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

      <div className="separator">VS</div>

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
      <TeamFlag teamName={match.team_b} />
    </div>
  );
}

function FinalResultColumn({ match }: { match: MatchWithPrediction }) {
  const isFinal = match.status.toLowerCase() === 'final';
  const hasFinalScore = isFinal && match.score_a !== null && match.score_b !== null;
  const showPenaltyWinner = hasFinalScore && isKnockoutStage(match.stage) && Boolean(match.penalty_winner);

  return (
    <aside className={`match-result-panel ${hasFinalScore ? 'is-final' : 'is-pending'}`}>
      <div>
        <div className="match-result-kicker">
          {hasFinalScore ? 'Final result' : 'Result pending'}
        </div>
        <div className="match-result-copy">
          {hasFinalScore ? 'Official match score' : 'It will update when the match ends'}
        </div>
      </div>

      <div className="result-scoreboard" aria-label="Match result">
        <TeamFlag teamName={match.team_a} />
        <ResultTeamBlock
          teamName={match.team_a}
          score={hasFinalScore ? match.score_a : null}
          wonOnPenalties={showPenaltyWinner && match.penalty_winner === 'team_a'}
        />
        <div className="separator">VS</div>
        <ResultTeamBlock
          teamName={match.team_b}
          score={hasFinalScore ? match.score_b : null}
          wonOnPenalties={showPenaltyWinner && match.penalty_winner === 'team_b'}
        />
        <TeamFlag teamName={match.team_b} />
      </div>

    </aside>
  );
}

function ResultTeamBlock({
  teamName,
  score,
  wonOnPenalties = false
}: {
  teamName: string;
  score: number | null;
  wonOnPenalties?: boolean;
}) {
  return (
    <div className="result-team-block">
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
        {getPlaceholderLabel(teamName)}
      </span>
    );
  }

  return (
    <Image
      className="team-flag"
      src={`/flags/${code}.svg`}
      alt={`${teamName} flag`}
      width={36}
      height={24}
    />
  );
}

function getPlaceholderLabel(teamName: string) {
  const normalizedTeamName = teamName.trim().toUpperCase();

  if (normalizedTeamName === 'TBD') return '?';
  if (normalizedTeamName.startsWith('WINNER ')) return 'W';
  if (normalizedTeamName.startsWith('LOSER ')) return 'L';

  return teamName.trim().slice(0, 1);
}

function getStatusLabel(status: string) {
  const value = status.toLowerCase();

  if (value === 'open') return 'Open';
  if (value === 'pending_teams') return 'Teams TBD';
  if (value === 'final') return 'Final';
  return 'Closed';
}

function shouldAutosavePrediction(match: MatchWithPrediction, draft: ScoreDraft) {
  if (!match.canEdit || draft.a === '' || draft.b === '') {
    return false;
  }

  const requiresPenaltyWinner =
    isKnockoutStage(match.stage) &&
    Number(draft.a) === Number(draft.b);

  if (requiresPenaltyWinner && !draft.penaltyWinner) {
    return false;
  }

  if (!match.hasPrediction) {
    return true;
  }

  const savedScoreA = match.myPredScoreA === '' ? '' : String(match.myPredScoreA);
  const savedScoreB = match.myPredScoreB === '' ? '' : String(match.myPredScoreB);
  const savedPenaltyWinner = match.myPredPenaltyWinner || null;

  return (
    draft.a !== savedScoreA ||
    draft.b !== savedScoreB ||
    (draft.penaltyWinner || null) !== savedPenaltyWinner
  );
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, '');
}

function isKnockoutStage(stage?: string | null) {
  const value = String(stage || '').toLowerCase();

  return [
    'round_of_32',
    'round_of_16',
    'quarterfinal',
    'semifinal',
    'third_place',
    'final'
  ].includes(value);
}

function normalizePenaltyWinner(value: string): PenaltyWinner {
  if (value === 'team_a' || value === 'team_b') {
    return value;
  }

  return null;
}
