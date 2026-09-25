# Backup periódico a Google Sheets

Vuelca automáticamente toda la base (grupos, ejercicios, sesiones, series) a un
Google Sheet, una vez por día. Sirve como backup y como forma fácil de que
Claude.ai o ChatGPT (con su conector de Google Drive) lean tus datos sin
necesitar acceso directo a la base.

## Setup (una sola vez)

1. Creá un Google Sheet nuevo y vacío, dedicado a esto (no reutilices el original de la app). Abrilo → **Extensiones > Apps Script**.
2. Borrá el contenido de `Código.gs` y pegá el de [`Code.gs`](./Code.gs) de este repo.
3. **Configuración del proyecto** (engranaje) → **Propiedades del script** → **Agregar propiedad del script**.
   Nombre: `APP_PIN`. Valor: el mismo PIN que usás para entrar a la app.
4. Volvé al editor, elegí la función `sync` en el selector de arriba y **Ejecutá**.
   Te va a pedir autorización la primera vez (tu cuenta, tus permisos). Revisá el
   Sheet: deberían aparecer las pestañas `Grupos`, `Ejercicios`, `Sesiones`, `Registros` e `Info`.
5. Elegí la función `crearTrigger` y **Ejecutá** una vez. Esto programa `sync` para
   correr sola, todos los días ~6am. No hace falta tocar nada más después de esto.

## Si cambia la URL de la app

Si en algún momento la URL de producción cambia, actualizá la constante
`EXPORT_URL` al principio de `Code.gs` (en el editor de Apps Script, no hace
falta redeploy de nada — se aplica en la próxima corrida).
