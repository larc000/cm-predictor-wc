import type { Match, MatchWithPrediction, Prediction } from './types';
import { DEFAULT_USER_TIMEZONE, getSupportedTimezone, normalizeUserTimezone } from './timezones';

export function isAllowedEmail(email: string, domain: string) {
  return email.trim().toLowerCase().endsWith(`@${domain.toLowerCase()}`);
}

export function getMatchEditState(match: Match) {
  const status = String(match.status || '').toLowerCase();

  if (status === 'pending_teams') {
    return {
      canEdit: false,
      reason: 'The teams for this match are still TBD.'
    };
  }

  if (status === 'final') {
    return {
      canEdit: false,
      reason: 'This match has already finished.'
    };
  }

  if (status !== 'open') {
    return {
      canEdit: false,
      reason: 'This match no longer allows changes or new predictions.'
    };
  }

  const matchDate = new Date(match.date_time);

  if (Number.isNaN(matchDate.getTime())) {
    return {
      canEdit: false,
      reason: 'The match date could not be validated.'
    };
  }

  const millisecondsBeforeMatch = matchDate.getTime() - Date.now();

  if (millisecondsBeforeMatch <= 0) {
    return {
      canEdit: false,
      reason: 'The match has already started. New predictions are not allowed.'
    };
  }

  const hoursBeforeMatch = millisecondsBeforeMatch / (1000 * 60 * 60);

  if (hoursBeforeMatch < 1) {
    return {
      canEdit: false,
      reason:
        'Predictions for this match are already closed. Predictions must be submitted at least 1 hour before kickoff.'
    };
  }

  return {
    canEdit: true,
    reason: ''
  };
}

export function mergeMatchesWithPredictions(
  matches: Match[],
  predictions: Prediction[]
): MatchWithPrediction[] {
  const predictionsByMatch = new Map(
    predictions.map((prediction) => [prediction.match_id, prediction])
  );

  return matches.map((match) => {
    const prediction = predictionsByMatch.get(match.match_id);
    const editState = getMatchEditState(match);

    return {
      ...match,
      hasPrediction: Boolean(prediction),
      myPredScoreA: prediction ? prediction.pred_score_a : '',
      myPredScoreB: prediction ? prediction.pred_score_b : '',
      myPredPenaltyWinner: prediction ? prediction.pred_penalty_winner : null,
      myPoints: prediction ? prediction.points : 0,
      canEdit: editState.canEdit,
      lockReason: editState.reason
    };
  });
}

export function formatMatchDate(dateTime: string, timezone = DEFAULT_USER_TIMEZONE) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: normalizeUserTimezone(timezone),
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(dateTime));
}

export function getMatchDateGroup(dateTime: string, timezone = DEFAULT_USER_TIMEZONE) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: normalizeUserTimezone(timezone),
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(dateTime));
}

export function getMatchDateKey(dateTime: string, timezone = DEFAULT_USER_TIMEZONE) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: normalizeUserTimezone(timezone),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(dateTime));

  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;

  return `${year}-${month}-${day}`;
}

export function getLocationFromTimezone(timezone?: string | null) {
  const supportedTimezone = getSupportedTimezone(timezone);

  return supportedTimezone?.region || 'No location';
}

export function getStageLabel(stage?: string | null) {
  const value = String(stage || '').toLowerCase();

  if (value === 'round_of_32') return 'Round of 32';
  if (value === 'round_of_16') return 'Round of 16';
  if (value === 'quarterfinal') return 'Quarterfinal';
  if (value === 'semifinal') return 'Semifinal';
  if (value === 'third_place') return 'Third Place';
  if (value === 'final') return 'Final';

  return stage;
}
