"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useAuth } from "@/lib/AuthContext";

export default function AuthGate({ children }: { children: ReactNode }) {
  const { authed, checking, login } = useAuth();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (checking) return null;
  if (authed) return <>{children}</>;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!pin.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const ok = await login(pin);
      if (!ok) setError("PIN incorrecto");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al conectar");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center p-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-xs rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl"
      >
        <h1 className="mb-1 text-lg font-semibold text-slate-100">
          Registro de Entrenamientos
        </h1>
        <p className="mb-5 text-sm text-slate-400">Ingresá tu PIN para continuar.</p>
        <input
          autoFocus
          inputMode="numeric"
          type="password"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="PIN"
          className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-center text-2xl tracking-widest text-slate-100 outline-none focus:border-emerald-500"
        />
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="mt-4 w-full rounded-xl bg-emerald-600 py-3 font-medium text-white transition active:scale-[0.98] disabled:opacity-50"
        >
          {submitting ? "Verificando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
