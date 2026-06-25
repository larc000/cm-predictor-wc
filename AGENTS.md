# CM Predictor - agent instructions

## Stack

- Next.js App Router
- React + TypeScript
- Supabase Auth
- Supabase Postgres
- Vercel
- Global CSS in `src/app/globals.css`

## Core rules

- Keep page files thin; reusable UI belongs in `src/components`.
- Business/domain logic belongs in `src/lib`.
- Presentational components must not import Supabase directly.
- Do not change business behavior during refactors unless explicitly requested.
- Match times are stored in UTC; timezone conversion happens only in frontend.
- Users must use `@omc.com` emails.
- Run `npm run lint` and `npm run build` before finishing coding tasks.

## Domain constants

Match statuses:
- `open`
- `closed`
- `pending_teams`
- `final`

Match stages:
- `round_of_32`
- `round_of_16`
- `quarterfinal`
- `semifinal`
- `third_place`
- `final`

Scoring:
- 1 point for correct result.
- +2 points for exact score.
- +1 point for correct penalty winner.
- Maximum 4 points per match.
- Predictions close 1 hour before kickoff.
- Knockout matches with TBD teams use `pending_teams`.

## Project map

- `src/app`: routes and page-level orchestration.
- `src/components`: reusable UI components.
- `src/lib/domain.ts`: domain helpers.
- `src/lib/types.ts`: shared TypeScript types.
- `src/lib/supabase.ts`: Supabase client/config.
- `src/assets`: static imported assets.
- `public`: public files served by Next.js.

## Reference docs

Read these only when relevant:

- `docs/architecture.md`: app structure, routes, components.
- `docs/database.md`: Supabase tables, statuses, stages, RLS notes.
- `docs/business-rules.md`: scoring, deadlines, user rules.
- `docs/deployment.md`: Vercel and Supabase environment setup.
- `docs/fifa-fixtures.md`: fixture data, UTC policy, country names.
- `docs/codex-workflows.md`: common prompts and task patterns.
