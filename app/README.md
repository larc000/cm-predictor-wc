# Quiniela CM - Next.js

Aplicacion Next.js para reemplazar la version de Google Apps Script.

## Setup

1. Crea `app/.env.local` basado en `app/.env.example`.
2. Copia `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` desde Supabase.
3. Ejecuta el SQL de `app/supabase/schema.sql` en el SQL Editor de Supabase.
4. En Supabase Auth, activa Email/Password.
5. En el dashboard de Supabase Auth, busca la configuracion de Email y apaga `Confirm email` / `Email confirmations`.
6. Carga participantes en `users` con `email`, `name`, `role` y `active`; deja `auth_user_id` vacio.
7. Ejecuta `app/supabase/worldcup_2026_all_matches_with_stage.sql` para cargar los partidos.
8. Corre la app:

```bash
cd app
npm install
npm run dev
```

Ejemplo para cargar participantes:

```sql
insert into public.users (email, name, role, active)
values
  ('persona@omc.com', 'Persona OMC', 'Player', true);
```

## Tablas esperadas

- `users`: lista de participantes permitidos y perfil mostrado en la app.
- `users.auth_user_id`: se llena automaticamente cuando el participante inicia sesion por primera vez.
- `matches`: partidos disponibles.
- `predictions`: pronosticos por usuario.
- `leaderboard`: vista calculada desde `users` + `predictions`.

## Notas

- La app valida que el correo termine en `@omc.com`.
- La app tambien valida que el correo exista previamente en `users`.
- El registro no depende de correos de verificacion de Supabase.
- La politica RLS tambien bloquea creacion de perfiles fuera de `@omc.com`.
- Los puntos se recalculan con un trigger cuando un partido pasa a `Final` o cambia marcador.
- Puntuacion: 1 punto por acertar resultado y 2 puntos extra por marcador exacto.
