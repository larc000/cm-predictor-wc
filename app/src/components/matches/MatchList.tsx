import { getMatchDateGroup } from '@/lib/domain';
import type {
  DraftScores,
  MatchResultStatsByMatch,
  MatchWinnerType,
  MatchWithPrediction,
  PenaltyWinner,
  PendingMatchParticipationByMatch
} from '@/lib/types';
import { MatchCard } from './MatchCard';

type MatchListProps = {
  groupedMatches: Record<string, MatchWithPrediction[]>;
  draftScores: DraftScores;
  savingMatchId: string;
  timezone: string;
  resultStatsByMatch?: MatchResultStatsByMatch;
  participationByMatch?: PendingMatchParticipationByMatch;
  emptyMessage?: string;
  dateSortDirection?: 'asc' | 'desc';
  showResultPanel?: boolean;
  onDraftChange: (matchId: string, side: 'a' | 'b', value: string) => void;
  onPenaltyWinnerChange: (matchId: string, penaltyWinner: PenaltyWinner) => void;
  onSubmitPrediction: (match: MatchWithPrediction) => void;
  onShowWinners: (matchId: string, winnerType: MatchWinnerType, title: string) => void;
};

export function MatchList({
  groupedMatches,
  draftScores,
  savingMatchId,
  timezone,
  resultStatsByMatch = {},
  participationByMatch = {},
  emptyMessage = 'There are no matches available.',
  dateSortDirection = 'asc',
  showResultPanel = true,
  onDraftChange,
  onPenaltyWinnerChange,
  onSubmitPrediction,
  onShowWinners
}: MatchListProps) {
  const dateKeys = Object.keys(groupedMatches);

  if (dateKeys.length === 0) {
    return <div className="notice">{emptyMessage}</div>;
  }

  return dateKeys
    .sort((a, b) => dateSortDirection === 'desc' ? b.localeCompare(a) : a.localeCompare(b))
    .map((dateKey) => (
    <div key={dateKey}>
      <h3 className="group-title">
        {getMatchDateGroup(groupedMatches[dateKey][0].date_time, timezone)}
      </h3>
      {groupedMatches[dateKey].map((match) => (
        <MatchCard
          key={match.match_id}
          match={match}
          draft={draftScores[match.match_id] || { a: '', b: '', penaltyWinner: null }}
          saving={savingMatchId === match.match_id}
          resultStats={resultStatsByMatch[match.match_id]}
          participationStats={participationByMatch[match.match_id]}
          timezone={timezone}
          showResultPanel={showResultPanel}
          onDraftChange={onDraftChange}
          onPenaltyWinnerChange={onPenaltyWinnerChange}
          onSubmitPrediction={onSubmitPrediction}
          onShowWinners={onShowWinners}
        />
      ))}
    </div>
  ));
}
