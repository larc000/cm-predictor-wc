---
name: fixture-qa
description: Use when modifying FIFA 2026 matches, country names, kickoff times, stages, statuses, UTC conversion, or fixture SQL.
---

# Fixture QA workflow

1. Read `docs/fifa-fixtures.md`.
2. Verify there are 104 matches total.
3. Verify there are 72 group matches.
4. Verify there are 12 groups with 6 matches each.
5. Verify 48 unique group-stage teams.
6. Verify knockout matches use `TBD` and `pending_teams`.
7. Verify all `date_time` values are UTC.
8. Verify stages use approved values from `AGENTS.md`.
9. Provide SQL queries to validate the data.