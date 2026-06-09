# Database

## Tables

- `users`
- `matches`
- `predictions`
- `leaderboard` view

## Match statuses

- `open`: users can predict if kickoff is more than 24 hours away.
- `closed`: manually or automatically unavailable.
- `pending_teams`: knockout match exists but teams are TBD.
- `final`: score is loaded and points can be calculated.

## Match stages

- `group`
- `round_of_32`
- `round_of_16`
- `quarterfinal`
- `semifinal`
- `third_place`
- `final`

## Time policy

All `matches.date_time` values are stored in UTC.
Frontend converts to `users.timezone`.