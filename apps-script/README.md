# Backend en Google Apps Script

Estos pasos conectan la app con tu Google Sheet. Se hacen una sola vez.

## 1. Preparar el Sheet

1. Abrí tu planilla: https://docs.google.com/spreadsheets/d/16kNOXXGa3DcAREFZiJtHUCmIHRtnXybojoBiq9TDa0Q
2. Renombrá la hoja que ya tiene tus datos (Fecha, Grupo Muscular, Ejercicio, Reps, Peso, Notas) a **`Registros`** (doble click en la pestaña de abajo).

## 2. Pegar el script

1. En el Sheet: **Extensiones > Apps Script**.
2. Borrá el contenido de `Código.gs` y pegá el contenido de [`Code.gs`](./Code.gs) de este repo.
3. Guardá (ícono de disquete o `Cmd+S`).

## 3. Configurar el PIN (token)

1. En el editor de Apps Script: **Configuración del proyecto** (ícono de engranaje, panel izquierdo).
2. Bajá hasta **Propiedades del script** > **Agregar propiedad del script**.
3. Nombre: `APP_TOKEN`. Valor: el PIN que quieras usar (ej. `4 a 8 caracteres, letras o números`). Guardá.
   - Este mismo valor es el que vas a tipear en la app cuando te pida el PIN.

## 4. Cargar el catálogo inicial de ejercicios

1. Volvé a la pestaña **Editor** (ícono `< >`).
2. Arriba, en el selector de funciones, elegí `setupInicial`.
3. Apretá **Ejecutar**. La primera vez te va a pedir autorización: elegí tu cuenta de Google y aceptá los permisos (es tu propio script accediendo a tu propio Sheet).
4. Esto crea las hojas **Ejercicios** y **Grupos** con los ejercicios que ya venías usando. Si esas hojas ya existen con datos, no las toca.
5. Revisá el log (**Ver > Registros**) para confirmar que dice "Setup listo".

## 5. Publicar como Web App

1. Arriba a la derecha: **Implementar > Nueva implementación**.
2. Tipo: **Aplicación web**.
3. Configuración:
   - **Ejecutar como**: Yo (tu cuenta)
   - **Quién tiene acceso**: Cualquier usuario
4. **Implementar**. Autorizá de nuevo si te lo pide.
5. Copiá la **URL de la aplicación web** (termina en `/exec`). Esa es la que va en `NEXT_PUBLIC_APPS_SCRIPT_URL`.

## Si después cambiás el código del script

Cada cambio a `Code.gs` requiere una nueva implementación para que se vea reflejado:
**Implementar > Administrar implementaciones > ✏️ (editar) > Nueva versión > Implementar**.
Así la URL `/exec` se mantiene igual, no hace falta actualizar la variable de entorno.
