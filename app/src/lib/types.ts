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
  status: 'Open' | 'Closed' | 'Final' | 'pending_teams' | string;
};

export type Prediction = {
  id: string;
  user_id: string;
  match_id: string;
  pred_score_a: number;
  pred_score_b: number;
  submitted_at: string;
  points: number;
};

export type MatchWithPrediction = Match & {
  hasPrediction: boolean;
  myPredScoreA: number | '';
  myPredScoreB: number | '';
  myPoints: number;
  canEdit: boolean;
  lockReason: string;
};

export type Tab = 'quiniela' | 'reglas' | 'ranking';

export type AuthMode = 'sign-in' | 'sign-up';

export type ScoreDraft = {
  a: string;
  b: string;
};

export type DraftScores = Record<string, ScoreDraft>;

export type EditingMap = Record<string, boolean>;

export type LeaderboardRow = {
  user_id: string;
  email: string;
  name: string | null;
  points: number;
};
