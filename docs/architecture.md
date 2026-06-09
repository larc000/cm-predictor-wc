# Architecture

## Routes

- `/quiniela`: user predictions and match list.
- `/reglas`: rules page.
- `/leaderboard`: ranking page.

## Components

- `components/layout`: Shell, navigation, shared layout.
- `components/auth`: login/signup UI.
- `components/matches`: match cards, grouped match lists, week/date grouping.
- `components/ranking`: leaderboard UI.
- `components/rules`: rules UI.
- `components/feedback`: toast/loading/error components.

## Rules

- Pages may load data and manage page-level state.
- Components should receive data and callbacks through props.
- Avoid duplicating date, scoring, or status logic in components.