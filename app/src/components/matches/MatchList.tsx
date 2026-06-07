import { getMatchDateGroup } from '@/lib/domain';
import type { DraftScores, EditingMap, MatchWithPrediction } from '@/lib/types';
import { MatchCard } from './MatchCard';

type MatchListProps = {
  groupedMatches: Record<string, MatchWithPrediction[]>;
  draftScores: DraftScores;
  editing: EditingMap;
  savingMatchId: string;
  timezone: string;
  onDraftChange: (matchId: string, side: 'a' | 'b', value: string) => void;
  onSubmitPrediction: (match: MatchWithPrediction) => void;
  onEditPrediction: (match: MatchWithPrediction) => void;
  onCancelEdit: (match: MatchWithPrediction) => void;
};

export function MatchList({
  groupedMatches,
  draftScores,
  editing,
  savingMatchId,
  timezone,
  onDraftChange,
  onSubmitPrediction,
  onEditPrediction,
  onCancelEdit
}: MatchListProps) {
  const dateKeys = Object.keys(groupedMatches);

  if (dateKeys.length === 0) {
    return <div className="notice">No hay partidos disponibles.</div>;
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
          draft={draftScores[match.match_id] || { a: '', b: '' }}
          editing={Boolean(editing[match.match_id])}
          saving={savingMatchId === match.match_id}
          timezone={timezone}
          onDraftChange={onDraftChange}
          onSubmitPrediction={onSubmitPrediction}
          onEditPrediction={onEditPrediction}
          onCancelEdit={onCancelEdit}
        />
      ))}
    </div>
  ));
}
