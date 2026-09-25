# Registro de Entrenamientos

App para registrar series de gimnasio rápido desde el celular. Backend propio en Next.js (rutas API) que habla directo con una base SQLite en Turso — sin dependencias externas lentas.

## Setup

1. Instalá el [CLI de Turso](https://docs.turso.tech/cli/installation) y logueate (`turso auth login`).
2. Creá la base y aplicá el esquema:
   ```bash
   turso db create gym-log
   turso db shell gym-log < db/schema.sql
   ```
3. Copiá `.env.local.example` a `.env.local` y completá:
   ```bash
   cp .env.local.example .env.local
   ```
   - `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN`: `turso db show gym-log` / `turso db tokens create gym-log`.
   - `APP_PIN`: el PIN que vas a tipear para entrar a la app.
4. Instalá dependencias y corré en local:
   ```bash
   npm install
   npm run dev
   ```
5. Abrí http://localhost:3000, ingresá tu `APP_PIN`.

## Deploy a Vercel

1. Subí este repo a GitHub.
2. En [vercel.com](https://vercel.com), **Add New Project**, importá el repo.
3. En **Environment Variables**, agregá `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` y `APP_PIN` (ninguna lleva prefijo `NEXT_PUBLIC_` — son server-only, nunca llegan al navegador).
4. Deploy. La URL de Vercel es la que usás desde el celular (podés agregarla a la pantalla de inicio como si fuera una app).

## Esquema de datos

Ver [`db/schema.sql`](./db/schema.sql). Cuatro tablas: `muscle_groups`, `exercises` (catálogo, editable desde `/manage`), `sessions` (una por visita al gym — arranca una nueva si pasaron más de 3hs sin cargar nada) y `sets` (cada serie, con una copia congelada del nombre del ejercicio/grupo al momento de cargarla, para que renombrar o borrar algo del catálogo no reescriba el historial).

`db/migrate.mjs` fue el script de migración única desde el Google Sheet original — queda como referencia, no se vuelve a correr.

## Estructura

- `src/app/page.tsx` — pantalla principal: elegir ejercicio, cargar serie, ver la sesión actual.
- `src/app/manage/page.tsx` — alta/baja/modificación de ejercicios y grupos musculares.
- `src/lib/api.ts` — cliente que habla con `/api/gym`.
- `src/app/api/gym/route.ts` — backend: valida el PIN y lee/escribe en Turso.
- `src/lib/db.ts` — cliente de Turso (server-only).
