import { getMatchDateGroup } from '@/lib/domain';
import type {
  DraftScores,
  EditingMap,
  MatchResultStatsByMatch,
  MatchWinnerType,
  MatchWithPrediction,
  PenaltyWinner
} from '@/lib/types';
import { MatchCard } from './MatchCard';

type MatchListProps = {
  groupedMatches: Record<string, MatchWithPrediction[]>;
  draftScores: DraftScores;
  editing: EditingMap;
  savingMatchId: string;
  timezone: string;
  resultStatsByMatch?: MatchResultStatsByMatch;
  emptyMessage?: string;
  onDraftChange: (matchId: string, side: 'a' | 'b', value: string) => void;
  onPenaltyWinnerChange: (matchId: string, penaltyWinner: PenaltyWinner) => void;
  onSubmitPrediction: (match: MatchWithPrediction) => void;
  onEditPrediction: (match: MatchWithPrediction) => void;
  onCancelEdit: (match: MatchWithPrediction) => void;
  onShowWinners: (matchId: string, winnerType: MatchWinnerType, title: string) => void;
};

export function MatchList({
  groupedMatches,
  draftScores,
  editing,
  savingMatchId,
  timezone,
  resultStatsByMatch = {},
  emptyMessage = 'No hay partidos disponibles.',
  onDraftChange,
  onPenaltyWinnerChange,
  onSubmitPrediction,
  onEditPrediction,
  onCancelEdit,
  onShowWinners
}: MatchListProps) {
  const dateKeys = Object.keys(groupedMatches);

  if (dateKeys.length === 0) {
    return <div className="notice">{emptyMessage}</div>;
  }

  return dateKeys.sort().map((dateKey) => (
    <div key={dateKey}>
      <h3 className="group-title">
        {getMatchDateGroup(groupedMatches[dateKey][0].date_time, timezone)}
      </h3>
      {groupedMatches[dateKey].map((match) => (
        <MatchCard
          key={match.match_id}
          match={match}
          draft={draftScores[match.match_id] || { a: '', b: '', penaltyWinner: null }}
          editing={Boolean(editing[match.match_id])}
          saving={savingMatchId === match.match_id}
          resultStats={resultStatsByMatch[match.match_id]}
          timezone={timezone}
          onDraftChange={onDraftChange}
          onPenaltyWinnerChange={onPenaltyWinnerChange}
          onSubmitPrediction={onSubmitPrediction}
          onEditPrediction={onEditPrediction}
          onCancelEdit={onCancelEdit}
          onShowWinners={onShowWinners}
        />
      ))}
    </div>
  ));
}
