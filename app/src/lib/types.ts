export type AppUser = {
  id: string;
  email: string;
  name: string | null;
  role: string | null;
  active: boolean;
};

export type Match = {
  match_id: string;
  group_name: string | null;
  date_time: string;
  team_a: string;
  team_b: string;
  score_a: number | null;
  score_b: number | null;
  status: 'Open' | 'Closed' | 'Final' | string;
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

export type LeaderboardRow = {
  user_id: string;
  email: string;
  name: string | null;
  points: number;
};
