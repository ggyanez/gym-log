# Registro de Entrenamientos

App mobile-first para registrar series de gimnasio en el momento, sin fricción — pensada para usarse con una mano, entre serie y serie.

Nació para reemplazar un Google Form que escribía a un Google Sheet: funcionaba, pero era incómodo y lento de completar en medio de un entrenamiento. La primera versión de esta app mantuvo el Sheet como backend (vía Google Apps Script), lo cual resolvió lo incómodo pero no lo lento — cada acción tardaba varios segundos, a veces más, por la arquitectura de redirección de Apps Script. Terminó migrada a una base de datos propia (Turso/libSQL) con rutas API en el mismo Next.js, bajando esa latencia de segundos a milisegundos.

## Funcionalidades

- **Registrar** — elegir ejercicio por chips agrupados por grupo muscular (con búsqueda y "recientes de hoy" para no perder tiempo buscando), cargar reps y peso con steppers táctiles, precargados con la última serie de ese ejercicio.
- **Historial** — series pasadas filtrables por fecha, ejercicio o grupo muscular, agrupadas por sesión.
- **Estadísticas** — series por grupo muscular, récords personales (peso máximo por ejercicio y cuándo se logró), progresión de peso en el tiempo por ejercicio, con selector de período (mes / año / todo).
- **Catálogo** — alta, baja y modificación de ejercicios y grupos musculares.
- **Backup automático** — export diario a Google Sheets vía un Apps Script con disparador programado; ver [`backup-apps-script/`](./backup-apps-script). Sirve como respaldo y como forma simple de que un asistente con conector de Google Drive (Claude, ChatGPT) lea los datos sin acceso directo a la base.

Queda detrás de un PIN compartido simple — suficiente para uso personal en un solo dispositivo, pero sin rate limiting ni multiusuario. No es el modelo de auth que usarías si esto sirviera a más de una persona.

## Stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript + Tailwind CSS
- [Turso](https://turso.tech) (libSQL / SQLite) como base de datos, sin ORM — rutas API propias hablándole directo
- Deploy en [Vercel](https://vercel.com)

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

Arrancás sin ejercicios cargados — se agregan desde la sección Catálogo.

## Deploy a Vercel

1. Subí este repo a GitHub.
2. En [vercel.com](https://vercel.com), **Add New Project**, importá el repo.
3. En **Environment Variables**, agregá `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` y `APP_PIN` (ninguna lleva prefijo `NEXT_PUBLIC_` — son server-only, nunca llegan al navegador).
4. Deploy. La URL de Vercel es la que usás desde el celular (podés agregarla a la pantalla de inicio como si fuera una app).

## Esquema de datos

Ver [`db/schema.sql`](./db/schema.sql). Cuatro tablas:

- `muscle_groups`, `exercises` — el catálogo, editable desde la sección Catálogo.
- `sessions` — una por visita al gym. Una serie nueva se suma a la sesión más reciente si pasaron menos de 3 horas desde la anterior; si no, arranca una sesión nueva. Así dos visitas el mismo día no se mezclan, y una sesión que cruza la medianoche no se corta en dos.
- `sets` — cada serie, con una copia congelada del nombre del ejercicio y su grupo al momento de cargarla. Renombrar o borrar algo del catálogo después no reescribe el historial.

`db/migrate.mjs` fue el script de migración única desde el Google Sheet original — queda como referencia, no se vuelve a correr.

## Estructura

```
src/app/page.tsx                 # Registrar
src/app/historial/page.tsx       # Historial
src/app/estadisticas/page.tsx    # Estadísticas
src/app/manage/page.tsx          # Catálogo
src/app/api/gym/route.ts         # backend de la app: valida el PIN, lee/escribe en Turso
src/app/api/export/route.ts      # dump de solo lectura, usado por el backup
src/lib/api.ts                   # cliente que habla con /api/gym
src/lib/db.ts                    # cliente de Turso (server-only)
src/components/BottomNav.tsx     # navegación de las 4 secciones
backup-apps-script/              # Apps Script del backup diario a Sheets
```
