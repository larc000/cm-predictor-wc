# Quiniela CM LATAM - agent instructions

## Stack

- Next.js App Router
- React + TypeScript
- Supabase Auth
- Supabase Postgres
- Vercel deployment
- CSS global in `src/app/globals.css`


## Architecture

- Page components orchestrate data loading.
- Business logic lives in src/lib.
- Reusable UI lives in src/components.
- Database access is isolated from visual components.
- Supabase queries should not be placed inside presentational components.

## Project Structure

src/
  app/
  components/
  lib/
  assets/

## Naming Conventions

- Components use PascalCase.
- Hooks use useX naming.
- Functions use camelCase.
- Types live in src/lib/types.ts.
- Prefer named exports.


## Database Rules

Match statuses:

- open
- closed
- pending_teams
- final

Match stages:

- group
- round_of_32
- round_of_16
- quarterfinal
- semifinal
- third_place
- final

All match times are stored in UTC.
Timezone conversion happens only in frontend.

## Business Rules

- Users can only register with @omc.com emails.
- Predictions close 24 hours before kickoff.
- 3 points for correct result.
- 2 additional points for exact score.
- Maximum points per match: 5.
- Knockout matches with TBD teams use status pending_teams.

## Quality Gates

Before completing a task:

- npm run lint
- npm run build

Both must pass.

## Refactor Guidelines

- Prefer composition over large page files.
- Components should stay under ~250 lines when practical.
- Avoid duplicating domain logic.
- Reuse utilities from src/lib/domain.ts.
- Do not change business behavior during refactors.

