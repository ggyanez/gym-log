import { getToken } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL ?? "";

export class UnauthorizedError extends Error {
  constructor() {
    super("PIN incorrecto");
    this.name = "UnauthorizedError";
  }
}

export class ApiError extends Error {
  transient: boolean;
  constructor(message: string, transient = false) {
    super(message);
    this.transient = transient;
  }
}

// Apps Script's redirect-based response delivery occasionally 404s or drops
// the connection for reasons unrelated to the request itself (its signed
// redirect URL expiring under latency, a transient Google-side hiccup).
// Retrying is only safe for actions that are pure reads or idempotent
// writes — never for ones that could duplicate or misfire (addRegistro,
// deleteRegistro), which is why this is an allowlist, not a default.
const SAFE_TO_RETRY = new Set([
  "verify",
  "getCatalogo",
  "getHoy",
  "getUltimo",
  "updateEjercicio",
  "updateGrupo",
]);

async function call<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  if (!API_URL) {
    throw new ApiError("Falta configurar NEXT_PUBLIC_APPS_SCRIPT_URL en las variables de entorno.");
  }

  try {
    return await callOnce<T>(action, payload);
  } catch (err) {
    if (err instanceof ApiError && err.transient && SAFE_TO_RETRY.has(action)) {
      await new Promise((r) => setTimeout(r, 700));
      return callOnce<T>(action, payload);
    }
    throw err;
  }
}

async function callOnce<T>(action: string, payload: Record<string, unknown>): Promise<T> {
  const token = getToken();

  // Content-Type text/plain avoids a CORS preflight (OPTIONS) request,
  // which Apps Script Web Apps don't handle. The script still parses the
  // body as JSON regardless of the declared content type.
  let res: Response;
  try {
    res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ token, action, payload }),
    });
  } catch {
    throw new ApiError("No se pudo conectar. Probá de nuevo.", true);
  }

  if (!res.ok) {
    throw new ApiError(`Error de red (${res.status})`, true);
  }

  const json = await res.json();

  if (json.ok === false) {
    if (json.error === "UNAUTHORIZED") throw new UnauthorizedError();
    throw new ApiError(json.error || "Error desconocido");
  }

  return json.data as T;
}

export { call };
