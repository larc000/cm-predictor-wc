# Architecture

## Routes

- `/knockout-stage`: user predictions and match list for all the stages within "round_of_32", "round_of_16", "quarterfinal", "semifinal", "third_place" and "final".
- `/rules`: rules page.
- `/leaderboard`: ranking page.
- `/leaderboard/personalizado`: browser-persisted custom leaderboard from selected participants.
- `/leaderboard/todos-los-pronosticos`: audit report for all submitted predictions.
- `/leaderboard/tabla-rendimiento`: read-only performance report backed by `performance_report`.

## Components

- `components/layout`: Shell, navigation, shared layout.
- `components/auth`: login/signup UI.
- `components/matches`: match cards, grouped match lists, week/date grouping.
- `components/ranking`: leaderboard UI.
- `components/performance`: performance report UI.
- `components/rules`: rules UI.
- `components/feedback`: toast/loading/error components.

## Rules

- Pages may load data and manage page-level state.
- Components should receive data and callbacks through props.
- Avoid duplicating date, scoring, or status logic in components.
- Prediction editability belongs in `src/lib/domain.ts`.
