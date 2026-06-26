-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  name text,
  role text NOT NULL DEFAULT 'Player'::text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  auth_user_id uuid,
  timezone text DEFAULT 'America/Costa_Rica'::text CHECK (timezone = ANY (ARRAY['America/Edmonton'::text, 'America/Chicago'::text, 'America/New_York'::text, 'America/Bogota'::text, 'America/Costa_Rica'::text, 'America/Los_Angeles'::text, 'Europe/Berlin'::text, 'Europe/London'::text, 'America/Toronto'::text, 'America/Vancouver'::text])),
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_auth_user_id_fkey FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE SET NULL
);
CREATE TABLE public.matches (
  match_id text NOT NULL,
  group_name text,
  date_time timestamp with time zone NOT NULL,
  team_a text NOT NULL,
  team_b text NOT NULL,
  score_a integer,
  score_b integer,
  penalty_winner text CHECK (penalty_winner = ANY (ARRAY['team_a'::text, 'team_b'::text])),
  status text NOT NULL DEFAULT 'open'::text CHECK (status = ANY (ARRAY['open'::text, 'closed'::text, 'pending_teams'::text, 'final'::text])),
  stage text DEFAULT 'group'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT matches_pkey PRIMARY KEY (match_id)
);
CREATE TABLE public.predictions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  match_id text NOT NULL,
  pred_score_a integer NOT NULL CHECK (pred_score_a >= 0),
  pred_score_b integer NOT NULL CHECK (pred_score_b >= 0),
  pred_penalty_winner text CHECK (pred_penalty_winner = ANY (ARRAY['team_a'::text, 'team_b'::text])),
  submitted_at timestamp with time zone NOT NULL DEFAULT now(),
  points integer NOT NULL DEFAULT 0,
  CONSTRAINT predictions_pkey PRIMARY KEY (id),
  CONSTRAINT predictions_user_match_unique UNIQUE (user_id, match_id),
  CONSTRAINT predictions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT predictions_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(match_id)
);
