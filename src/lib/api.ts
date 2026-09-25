import { getToken } from "./auth";

// Same-origin Next.js API route — no external service, no CORS, no redirect
// hop. Talks directly to Turso server-side (see src/app/api/gym/route.ts).
const API_URL = "/api/gym";

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

// A dropped mobile connection can still make a request fail after it
// reached the server. Retrying is only safe for actions that are pure reads
// or idempotent writes — never for ones that could duplicate or misfire
// (addRegistro, deleteRegistro), which is why this is an allowlist.
const SAFE_TO_RETRY = new Set([
  "verify",
  "getCatalogo",
  "getHoy",
  "getUltimo",
  "updateEjercicio",
  "updateGrupo",
]);

async function call<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
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

  // A hard timeout keeps a dropped connection from leaving the UI "loading"
  // forever with no error and no way out.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  let res: Response;
  try {
    res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, action, payload }),
      signal: controller.signal,
    });
  } catch {
    throw new ApiError("No se pudo conectar. Probá de nuevo.", true);
  } finally {
    clearTimeout(timeout);
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
