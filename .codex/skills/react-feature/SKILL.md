---
name: react-feature
description: Use when implementing or refactoring React/Next.js UI features, components, routes, navigation, forms, or client state.
---

# React feature workflow

1. Read `docs/architecture.md`.
2. Keep page files thin.
3. Put reusable UI in `src/components`.
4. Keep Supabase imports out of presentational components.
5. Use TypeScript props.
6. Preserve existing business behavior unless requested.
7. Prefer named exports.
8. Run:
   - `npm run lint`
   - `npm run build`