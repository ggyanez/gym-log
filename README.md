# Registro de Entrenamientos

App para registrar series de gimnasio rápido desde el celular, reemplazando el Google Form. Escribe directo en el Google Sheet a través de un Google Apps Script.

## Setup

1. Seguí [`apps-script/README.md`](./apps-script/README.md) para conectar el Sheet (una sola vez).
2. Copiá `.env.local.example` a `.env.local` y pegá la URL del Web App:
   ```bash
   cp .env.local.example .env.local
   ```
3. Instalá dependencias y corré en local:
   ```bash
   npm install
   npm run dev
   ```
4. Abrí http://localhost:3000, ingresá el PIN que configuraste como `APP_TOKEN`.

## Deploy a Vercel

1. Subí este repo a GitHub (privado).
2. En [vercel.com](https://vercel.com), **Add New Project**, importá el repo.
3. En **Environment Variables**, agregá `NEXT_PUBLIC_APPS_SCRIPT_URL` con la URL del Web App.
4. Deploy. Listo — la URL de Vercel es la que usás desde el celular (podés agregarla a la pantalla de inicio como si fuera una app).

## Estructura

- `src/app/page.tsx` — pantalla principal: elegir ejercicio, cargar serie, ver el registro de hoy.
- `src/app/manage/page.tsx` — alta/baja/modificación de ejercicios y grupos musculares.
- `src/lib/api.ts` — cliente que habla con el Apps Script Web App.
- `apps-script/Code.gs` — backend, vive pegado en el Google Sheet.
