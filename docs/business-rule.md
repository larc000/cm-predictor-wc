# Business rules

## Users

- Only `@omc.com` emails are allowed.
- Users must be active to participate.

## Predictions

- One prediction per user per match.
- Users may edit predictions until 24 hours before kickoff.
- `pending_teams`, `closed`, and `final` matches cannot be predicted.
- `matches.force_open = true` bypasses only the 24-hour cutoff for an `open` match.
- `force_open` never allows predictions after kickoff. If current time is greater than or equal to `matches.date_time`, the match is locked.
- `force_open` does not override `closed`, `pending_teams`, or `final`.

## Scoring

- Correct result: 1 point.
- Exact score: +2 points.
- Correct penalty winner: +1 point.
- Maximum per match: 4 points.
