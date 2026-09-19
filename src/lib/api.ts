import { getToken } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL ?? "";

export class UnauthorizedError extends Error {
  constructor() {
    super("PIN incorrecto");
    this.name = "UnauthorizedError";
  }
}

export class ApiError extends Error {}

async function call<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  if (!API_URL) {
    throw new ApiError(
      "Falta configurar NEXT_PUBLIC_APPS_SCRIPT_URL en las variables de entorno."
    );
  }

  const token = getToken();

  // Content-Type text/plain avoids a CORS preflight (OPTIONS) request,
  // which Apps Script Web Apps don't handle. The script still parses the
  // body as JSON regardless of the declared content type.
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ token, action, payload }),
  });

  if (!res.ok) {
    throw new ApiError(`Error de red (${res.status})`);
  }

  const json = await res.json();

  if (json.ok === false) {
    if (json.error === "UNAUTHORIZED") throw new UnauthorizedError();
    throw new ApiError(json.error || "Error desconocido");
  }

  return json.data as T;
}

export { call };
