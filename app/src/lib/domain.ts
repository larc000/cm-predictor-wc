import type { Match, MatchWithPrediction, Prediction } from './types';

export function isAllowedEmail(email: string, domain: string) {
  return email.trim().toLowerCase().endsWith(`@${domain.toLowerCase()}`);
}

export function getMatchEditState(match: Match) {
  if (match.status !== 'Open') {
    return {
      canEdit: false,
      reason: 'Este partido ya no está abierto para predicciones.'
    };
  }

  const matchDate = new Date(match.date_time);

  if (Number.isNaN(matchDate.getTime())) {
    return {
      canEdit: false,
      reason: 'No se pudo validar la fecha del partido.'
    };
  }

  const hoursBeforeMatch = (matchDate.getTime() - Date.now()) / (1000 * 60 * 60);

  if (hoursBeforeMatch < 24) {
    return {
      canEdit: false,
      reason: 'Cerró 24 horas antes del partido.'
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
      myPoints: prediction ? prediction.points : 0,
      canEdit: editState.canEdit,
      lockReason: editState.reason
    };
  });
}

export function formatMatchDate(value: string) {
  return new Intl.DateTimeFormat('es-CR', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}
