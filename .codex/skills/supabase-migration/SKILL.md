---
name: supabase-migration
description: Use when changing Supabase schema, RLS policies, SQL seed data, match statuses, scoring functions, or database views.
---

# Supabase migration workflow

1. Read `docs/database.md`.
2. Identify affected tables, views, functions, triggers, and RLS policies.
3. Prefer additive migrations.
4. Do not break existing prediction IDs or match IDs.
5. Keep match statuses lowercase.
6. Keep match times in UTC.
7. Provide rollback notes when useful.
8. After code changes, run:
   - `npm run lint`
   - `npm run build`