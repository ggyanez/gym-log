"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { call, UnauthorizedError } from "@/lib/api";
import { useScrollRestore } from "@/lib/useScrollRestore";
import { renderFormatted } from "@/lib/textFormat";
import FormattableTextarea from "@/components/FormattableTextarea";
import type { RutinaSesion } from "@/lib/types";

type RutinaFormValue = { sesion: string; ejercicios: string; descansos: string; notas: string };

export default function RutinaPage() {
  const { logout } = useAuth();
  const [sesiones, setSesiones] = useState<RutinaSesion[] | null>(null);
  const [editando, setEditando] = useState<number | "nueva" | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useScrollRestore("rutina", sesiones !== null);

  function load() {
    call<RutinaSesion[]>("getRutina")
      .then(setSesiones)
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

  async function guardarNueva(sesion: RutinaFormValue) {
    try {
      await call("addRutina", sesion);
      setEditando(null);
      load();
    } catch (err) {
      if (err instanceof UnauthorizedError) logout();
      else setErrorMsg(err instanceof Error ? err.message : "Error al guardar");
    }
  }

  async function guardarEdicion(id: number, sesion: RutinaFormValue) {
    try {
      await call("updateRutina", { id, ...sesion });
      setEditando(null);
      load();
    } catch (err) {
      if (err instanceof UnauthorizedError) logout();
      else setErrorMsg(err instanceof Error ? err.message : "Error al guardar");
    }
  }

  async function borrar(id: number) {
    if (!confirm("¿Borrar esta sesión?")) return;
    try {
      await call("deleteRutina", { id });
      load();
    } catch (err) {
      if (err instanceof UnauthorizedError) logout();
      else setErrorMsg(err instanceof Error ? err.message : "Error al borrar");
    }
  }

  async function mover(id: number, direccion: "up" | "down") {
    try {
      await call("moverRutina", { id, direccion });
      load();
    } catch (err) {
      if (err instanceof UnauthorizedError) logout();
      else setErrorMsg(err instanceof Error ? err.message : "Error al reordenar");
    }
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-2xl px-4 pb-24 pt-4">
      <h1 className="mb-4 text-lg font-semibold text-slate-100">Rutina</h1>

      {errorMsg && (
        <p className="mb-4 rounded-lg bg-red-950 px-3 py-2 text-sm text-red-300">{errorMsg}</p>
      )}

      {!sesiones && !errorMsg && <p className="text-sm text-slate-500">Cargando...</p>}

      {sesiones && sesiones.length === 0 && editando !== "nueva" && (
        <p className="mb-4 text-sm text-slate-500">Todavía no cargaste ninguna sesión.</p>
      )}

      <div className="space-y-3">
        {sesiones?.map((s, i) =>
          editando === s.id ? (
            <SesionForm
              key={s.id}
              inicial={s}
              onGuardar={(valores) => guardarEdicion(s.id, valores)}
              onCancelar={() => setEditando(null)}
            />
          ) : (
            <SesionCard
              key={s.id}
              sesion={s}
              esPrimera={i === 0}
              esUltima={i === sesiones.length - 1}
              onEditar={() => setEditando(s.id)}
              onBorrar={() => borrar(s.id)}
              onMover={(dir) => mover(s.id, dir)}
            />
          ),
        )}

        {editando === "nueva" && (
          <SesionForm
            inicial={{ sesion: "", ejercicios: "", descansos: "", notas: "" }}
            onGuardar={guardarNueva}
            onCancelar={() => setEditando(null)}
          />
        )}
      </div>

      {editando === null && (
        <button
          onClick={() => setEditando("nueva")}
          className="mt-4 w-full rounded-lg border border-dashed border-slate-700 py-2.5 text-sm text-emerald-400"
        >
          + Agregar sesión
        </button>
      )}
    </div>
  );
}

function Bloque({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{titulo}</p>
      <p className="whitespace-pre-wrap text-sm text-slate-300">
        {texto ? renderFormatted(texto) : "—"}
      </p>
    </div>
  );
}

function SesionCard({
  sesion,
  esPrimera,
  esUltima,
  onEditar,
  onBorrar,
  onMover,
}: {
  sesion: RutinaSesion;
  esPrimera: boolean;
  esUltima: boolean;
  onEditar: () => void;
  onBorrar: () => void;
  onMover: (dir: "up" | "down") => void;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="min-w-0 truncate font-semibold text-slate-100">
          {sesion.sesion || <span className="italic text-slate-500">Sin nombre</span>}
        </p>
        <div className="flex shrink-0 items-center gap-3 text-sm">
          <button
            onClick={() => onMover("up")}
            disabled={esPrimera}
            aria-label="Subir"
            className="disabled:opacity-20"
          >
            ▲
          </button>
          <button
            onClick={() => onMover("down")}
            disabled={esUltima}
            aria-label="Bajar"
            className="disabled:opacity-20"
          >
            ▼
          </button>
          <button onClick={onEditar} aria-label="Editar">
            ✏️
          </button>
          <button onClick={onBorrar} aria-label="Borrar">
            🗑
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Bloque titulo="Ejercicios" texto={sesion.ejercicios} />
        <Bloque titulo="Descansos" texto={sesion.descansos} />
      </div>
      {sesion.notas && (
        <div className="mt-3">
          <Bloque titulo="Notas" texto={sesion.notas} />
        </div>
      )}
    </div>
  );
}

function SesionForm({
  inicial,
  onGuardar,
  onCancelar,
}: {
  inicial: RutinaFormValue;
  onGuardar: (valores: RutinaFormValue) => void;
  onCancelar: () => void;
}) {
  const [sesion, setSesion] = useState(inicial.sesion);
  const [ejercicios, setEjercicios] = useState(inicial.ejercicios);
  const [descansos, setDescansos] = useState(inicial.descansos);
  const [notas, setNotas] = useState(inicial.notas);

  return (
    <div className="rounded-xl border border-emerald-700 bg-slate-900 p-3">
      <input
        value={sesion}
        onChange={(ev) => setSesion(ev.target.value)}
        placeholder="Nombre (ej: 🦵 LEGS)"
        className="mb-3 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
      />
      <div className="mb-3">
        <FormattableTextarea
          value={ejercicios}
          onChange={setEjercicios}
          placeholder="Ejercicios..."
          rows={6}
        />
      </div>
      <div className="mb-3">
        <FormattableTextarea
          value={descansos}
          onChange={setDescansos}
          placeholder="Descansos..."
          rows={4}
        />
      </div>
      <div className="mb-3">
        <FormattableTextarea value={notas} onChange={setNotas} placeholder="Notas..." rows={3} />
      </div>
      <div className="flex gap-3">
        <button
          onClick={() => onGuardar({ sesion, ejercicios, descansos, notas })}
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
