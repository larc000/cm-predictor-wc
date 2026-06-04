# Quiniela CM - Next.js

Aplicacion Next.js para reemplazar la version de Google Apps Script.

## Setup

1. Crea `app/.env.local` basado en `app/.env.example`.
2. Copia `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` desde Supabase.
3. Ejecuta el SQL de `app/supabase/schema.sql` en el SQL Editor de Supabase.
4. En Supabase Auth, activa Email/Password.
5. Si usas confirmacion de email, configura el Site URL y Redirect URLs para tu dominio local/produccion.
6. Importa tus partidos a la tabla `matches`.
7. Corre la app:

```bash
cd app
npm install
npm run dev
```

## Tablas esperadas

- `users`: perfil del usuario autenticado.
- `matches`: partidos disponibles.
- `predictions`: pronosticos por usuario.
- `leaderboard`: vista calculada desde `users` + `predictions`.

## Notas

- La app valida que el correo termine en `@omc.com`.
- La politica RLS tambien bloquea creacion de perfiles fuera de `@omc.com`.
- Los puntos se recalculan con un trigger cuando un partido pasa a `Final` o cambia marcador.
