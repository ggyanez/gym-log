"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { call, UnauthorizedError } from "@/lib/api";
import type { RutinaDia } from "@/lib/types";

const DIAS_JS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

function hoyEs(dia: string) {
  return DIAS_JS[new Date().getDay()] === dia;
}

export default function RutinaPage() {
  const { logout } = useAuth();
  const [dias, setDias] = useState<RutinaDia[] | null>(null);
  const [editando, setEditando] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function load() {
    call<RutinaDia[]>("getRutina")
      .then(setDias)
      .catch((err) => {
        if (err instanceof UnauthorizedError) logout();
        else setErrorMsg(err instanceof Error ? err.message : "Error al cargar");
      });
  }

  useEffect(() => {
    // Fetch-on-mount; load() itself has no synchronous setState before the await.
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function guardar(dia: string, sesion: string, ejercicios: string, descansos: string) {
    try {
      await call("upsertRutina", { dia, sesion, ejercicios, descansos });
      setEditando(null);
      load();
    } catch (err) {
      if (err instanceof UnauthorizedError) logout();
      else setErrorMsg(err instanceof Error ? err.message : "Error al guardar");
    }
  }

  async function borrar(dia: string) {
    if (!confirm(`¿Borrar la rutina de ${dia}?`)) return;
    try {
      await call("deleteRutina", { dia });
      load();
    } catch (err) {
      if (err instanceof UnauthorizedError) logout();
      else setErrorMsg(err instanceof Error ? err.message : "Error al borrar");
    }
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-2xl px-4 pb-24 pt-4">
      <h1 className="mb-4 text-lg font-semibold text-slate-100">Rutina</h1>

      {errorMsg && (
        <p className="mb-4 rounded-lg bg-red-950 px-3 py-2 text-sm text-red-300">{errorMsg}</p>
      )}

      {!dias && !errorMsg && <p className="text-sm text-slate-500">Cargando...</p>}

      <div className="space-y-3">
        {dias?.map((d) =>
          editando === d.dia ? (
            <DiaForm key={d.dia} dia={d} onGuardar={guardar} onCancelar={() => setEditando(null)} />
          ) : (
            <DiaCard
              key={d.dia}
              dia={d}
              hoy={hoyEs(d.dia)}
              onEditar={() => setEditando(d.dia)}
              onBorrar={() => borrar(d.dia)}
            />
          ),
        )}
      </div>
    </div>
  );
}

function DiaCard({
  dia,
  hoy,
  onEditar,
  onBorrar,
}: {
  dia: RutinaDia;
  hoy: boolean;
  onEditar: () => void;
  onBorrar: () => void;
}) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        hoy ? "border-emerald-600 bg-emerald-950/20" : "border-slate-800 bg-slate-900"
      }`}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-slate-100">{dia.dia}</p>
            {hoy && (
              <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                HOY
              </span>
            )}
          </div>
          {dia.sesion && <p className="text-sm text-slate-400">{dia.sesion}</p>}
        </div>
        <div className="flex shrink-0 gap-3 text-sm">
          <button onClick={onEditar} aria-label="Editar">
            ✏️
          </button>
          {dia.cargado && (
            <button onClick={onBorrar} aria-label="Borrar">
              🗑
            </button>
          )}
        </div>
      </div>

      {!dia.cargado ? (
        <button onClick={onEditar} className="text-sm text-emerald-400 underline">
          + Agregar rutina
        </button>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Ejercicios
            </p>
            <p className="whitespace-pre-wrap text-sm text-slate-300">{dia.ejercicios || "—"}</p>
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Descansos
            </p>
            <p className="whitespace-pre-wrap text-sm text-slate-300">{dia.descansos || "—"}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function DiaForm({
  dia,
  onGuardar,
  onCancelar,
}: {
  dia: RutinaDia;
  onGuardar: (dia: string, sesion: string, ejercicios: string, descansos: string) => void;
  onCancelar: () => void;
}) {
  const [sesion, setSesion] = useState(dia.sesion);
  const [ejercicios, setEjercicios] = useState(dia.ejercicios);
  const [descansos, setDescansos] = useState(dia.descansos);

  return (
    <div className="rounded-xl border border-emerald-700 bg-slate-900 p-3">
      <p className="mb-2 font-semibold text-slate-100">{dia.dia}</p>
      <input
        value={sesion}
        onChange={(e) => setSesion(e.target.value)}
        placeholder="Sesión (ej: 🦵 LEGS)"
        className="mb-2 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
      />
      <textarea
        value={ejercicios}
        onChange={(e) => setEjercicios(e.target.value)}
        placeholder="Ejercicios..."
        rows={6}
        className="mb-2 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
      />
      <textarea
        value={descansos}
        onChange={(e) => setDescansos(e.target.value)}
        placeholder="Descansos..."
        rows={4}
        className="mb-3 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
      />
      <div className="flex gap-3">
        <button
          onClick={() => onGuardar(dia.dia, sesion, ejercicios, descansos)}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white"
        >
          Guardar
        </button>
        <button onClick={onCancelar} className="text-sm text-slate-400">
          Cancelar
        </button>
      </div>
    </div>
  );
}
