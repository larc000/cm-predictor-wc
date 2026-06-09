export type AppUser = {
  id: string;
  auth_user_id: string | null;
  email: string;
  name: string | null;
  role: string | null;
  active: boolean;
  timezone: string | null;
};

export type Match = {
  match_id: string;
  group_name: string | null;
  stage: string | null;
  date_time: string;
  team_a: string;
  team_b: string;
  score_a: number | null;
  score_b: number | null;
  penalty_winner: PenaltyWinner;
  status: 'Open' | 'Closed' | 'Final' | 'pending_teams' | string;
  created_at: string;
  updated_at: string;
};

export type PenaltyWinner = 'team_a' | 'team_b' | null;

export type Prediction = {
  id: string;
  user_id: string;
  match_id: string;
  pred_score_a: number;
  pred_score_b: number;
  pred_penalty_winner: PenaltyWinner;
  submitted_at: string;
  points: number;
};

export type MatchWithPrediction = Match & {
  hasPrediction: boolean;
  myPredScoreA: number | '';
  myPredScoreB: number | '';
  myPredPenaltyWinner: PenaltyWinner;
  myPoints: number;
  canEdit: boolean;
  lockReason: string;
};

export type AppSection = 'fase-grupos' | 'fase-eliminatoria' | 'reglas' | 'leaderboard';

export type AuthMode = 'sign-in' | 'sign-up';

export type ScoreDraft = {
  a: string;
  b: string;
  penaltyWinner: PenaltyWinner;
};

export type DraftScores = Record<string, ScoreDraft>;

export type EditingMap = Record<string, boolean>;

export type LeaderboardRow = {
  user_id: string;
  email: string;
  name: string | null;
  timezone: string | null;
  points: number;
};
