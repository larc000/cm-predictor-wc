import type { Match, MatchWithPrediction, Prediction } from './types';

export function isAllowedEmail(email: string, domain: string) {
  return email.trim().toLowerCase().endsWith(`@${domain.toLowerCase()}`);
}

export function getMatchEditState(match: Match) {
  const status = String(match.status || '').toLowerCase();

  if (status === 'pending_teams') {
    return {
      canEdit: false,
      reason: 'Los equipos de este partido todavía están por definirse.'
    };
  }

  if (status !== 'open') {
    return {
      canEdit: false,
      reason: 'Este partido no está abierto para predicciones.'
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

export function formatMatchDate(dateTime: string, timezone = 'America/Costa_Rica') {
  return new Intl.DateTimeFormat('es-CR', {
    timeZone: timezone,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(dateTime));
}

export function getMatchDateGroup(dateTime: string, timezone = 'America/Costa_Rica') {
  return new Intl.DateTimeFormat('es-CR', {
    timeZone: timezone,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(dateTime));
}

export function getMatchDateKey(dateTime: string, timezone = 'America/Costa_Rica') {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(dateTime));

  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;

  return `${year}-${month}-${day}`;
}

export function getStageLabel(stage?: string | null) {
  const value = String(stage || '').toLowerCase();

  if (value === 'group') return 'Fase de grupos';
  if (value === 'round_of_32') return 'Dieciseisavos';
  if (value === 'round_of_16') return 'Octavos de final';
  if (value === 'quarterfinal') return 'Cuartos de final';
  if (value === 'semifinal') return 'Semifinal';
  if (value === 'third_place') return 'Tercer lugar';
  if (value === 'final') return 'Final';

  return stage;
}
