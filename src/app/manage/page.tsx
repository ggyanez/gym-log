"use client";

import { useState } from "react";
import Link from "next/link";
import { useCatalog } from "@/lib/CatalogContext";

export default function ManagePage() {
  const {
    catalogo,
    loading,
    addEjercicio,
    updateEjercicio,
    deleteEjercicio,
    addGrupo,
    updateGrupo,
    deleteGrupo,
  } = useCatalog();

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function guard(fn: () => Promise<void>) {
    setErrorMsg(null);
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-2xl px-4 py-4">
      <div className="mb-5 flex items-center gap-3">
        <Link href="/" className="text-xl text-slate-400" aria-label="Volver">
          ←
        </Link>
        <h1 className="text-lg font-semibold text-slate-100">Gestionar catálogo</h1>
      </div>

      {errorMsg && (
        <p className="mb-4 rounded-lg bg-red-950 px-3 py-2 text-sm text-red-300">{errorMsg}</p>
      )}

      {loading && <p className="text-sm text-slate-500">Cargando...</p>}

      <GruposSection
        grupos={catalogo.grupos}
        busy={busy}
        onAdd={(nombre) => guard(() => addGrupo(nombre))}
        onUpdate={(orig, nombre) => guard(() => updateGrupo(orig, nombre))}
        onDelete={(nombre) => guard(() => deleteGrupo(nombre))}
      />

      <EjerciciosSection
        ejercicios={catalogo.ejercicios}
        grupos={catalogo.grupos}
        busy={busy}
        onAdd={(e) => guard(() => addEjercicio(e))}
        onUpdate={(orig, e) => guard(() => updateEjercicio(orig, e))}
        onDelete={(nombre) => guard(() => deleteEjercicio(nombre))}
      />
    </div>
  );
}

function GruposSection({
  grupos,
  busy,
  onAdd,
  onUpdate,
  onDelete,
}: {
  grupos: string[];
  busy: boolean;
  onAdd: (nombre: string) => void;
  onUpdate: (original: string, nombre: string) => void;
  onDelete: (nombre: string) => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [newGrupo, setNewGrupo] = useState("");

  return (
    <section className="mb-8">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Grupos musculares
      </h2>
      <ul className="space-y-1.5">
        {grupos.map((g) =>
          editing === g ? (
            <li key={g} className="flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2">
              <input
                autoFocus
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-sm text-slate-100 outline-none focus:border-emerald-500"
              />
              <button
                disabled={busy}
                onClick={() => {
                  onUpdate(g, editValue.trim());
                  setEditing(null);
                }}
                className="shrink-0 text-sm text-emerald-400"
              >
                Guardar
              </button>
              <button onClick={() => setEditing(null)} className="shrink-0 text-sm text-slate-500">
                Cancelar
              </button>
            </li>
          ) : (
            <li
              key={g}
              className="flex items-center justify-between gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm text-slate-200"
            >
              <span className="truncate">{g}</span>
              <div className="flex shrink-0 gap-3">
                <button
                  onClick={() => {
                    setEditing(g);
                    setEditValue(g);
                  }}
                  aria-label="Editar"
                >
                  ✏️
                </button>
                <button
                  disabled={busy}
                  onClick={() => {
                    if (confirm(`¿Borrar el grupo "${g}"?`)) onDelete(g);
                  }}
                  aria-label="Borrar"
                >
                  🗑
                </button>
              </div>
            </li>
          )
        )}
      </ul>

      <div className="mt-2 flex gap-2">
        <input
          value={newGrupo}
          onChange={(e) => setNewGrupo(e.target.value)}
          placeholder="Nuevo grupo (ej: Piernas)"
          className="min-w-0 flex-1 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
        />
        <button
          disabled={busy || !newGrupo.trim()}
          onClick={() => {
            onAdd(newGrupo.trim());
            setNewGrupo("");
          }}
          className="shrink-0 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          + Agregar
        </button>
      </div>
    </section>
  );
}

type EjercicioForm = { nombre: string; grupo: string; sinPeso: boolean };

function EjerciciosSection({
  ejercicios,
  grupos,
  busy,
  onAdd,
  onUpdate,
  onDelete,
}: {
  ejercicios: EjercicioForm[];
  grupos: string[];
  busy: boolean;
  onAdd: (e: EjercicioForm) => void;
  onUpdate: (original: string, e: EjercicioForm) => void;
  onDelete: (nombre: string) => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EjercicioForm>({
    nombre: "",
    grupo: "",
    sinPeso: false,
  });
  const [newForm, setNewForm] = useState<EjercicioForm>({
    nombre: "",
    grupo: grupos[0] ?? "",
    sinPeso: false,
  });

  return (
    <section>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Ejercicios
      </h2>
      <ul className="space-y-1.5">
        {ejercicios.map((e) =>
          editing === e.nombre ? (
            <li key={e.nombre} className="rounded-lg bg-slate-900 px-3 py-2">
              <input
                autoFocus
                value={editForm.nombre}
                onChange={(ev) => setEditForm((f) => ({ ...f, nombre: ev.target.value }))}
                className="mb-2 w-full rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-sm text-slate-100 outline-none focus:border-emerald-500"
              />
              <div className="flex items-center gap-2">
                <select
                  value={editForm.grupo}
                  onChange={(ev) => setEditForm((f) => ({ ...f, grupo: ev.target.value }))}
                  className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-sm text-slate-100"
                >
                  {grupos.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
                <label className="flex shrink-0 items-center gap-1 text-xs text-slate-400">
                  <input
                    type="checkbox"
                    checked={editForm.sinPeso}
                    onChange={(ev) =>
                      setEditForm((f) => ({ ...f, sinPeso: ev.target.checked }))
                    }
                  />
                  Sin peso
                </label>
              </div>
              <div className="mt-2 flex gap-3">
                <button
                  disabled={busy}
                  onClick={() => {
                    onUpdate(e.nombre, {
                      ...editForm,
                      nombre: editForm.nombre.trim(),
                    });
                    setEditing(null);
                  }}
                  className="text-sm text-emerald-400"
                >
                  Guardar
                </button>
                <button onClick={() => setEditing(null)} className="text-sm text-slate-500">
                  Cancelar
                </button>
              </div>
            </li>
          ) : (
            <li
              key={e.nombre}
              className="flex items-center justify-between gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-200">{e.nombre}</p>
                <p className="text-xs text-slate-500">
                  {e.grupo}
                  {e.sinPeso ? " · sin peso" : ""}
                </p>
              </div>
              <div className="flex shrink-0 gap-3">
                <button
                  onClick={() => {
                    setEditing(e.nombre);
                    setEditForm(e);
                  }}
                  aria-label="Editar"
                >
                  ✏️
                </button>
                <button
                  disabled={busy}
                  onClick={() => {
                    if (confirm(`¿Borrar el ejercicio "${e.nombre}"?`)) onDelete(e.nombre);
                  }}
                  aria-label="Borrar"
                >
                  🗑
                </button>
              </div>
            </li>
          )
        )}
      </ul>

      <div className="mt-3 space-y-2 rounded-lg border border-dashed border-slate-800 p-3">
        <input
          value={newForm.nombre}
          onChange={(e) => setNewForm((f) => ({ ...f, nombre: e.target.value }))}
          placeholder="Nombre del ejercicio"
          className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
        />
        <div className="flex items-center gap-2">
          <select
            value={newForm.grupo}
            onChange={(e) => setNewForm((f) => ({ ...f, grupo: e.target.value }))}
            className="min-w-0 flex-1 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100"
          >
            {grupos.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <label className="flex shrink-0 items-center gap-1 text-xs text-slate-400">
            <input
              type="checkbox"
              checked={newForm.sinPeso}
              onChange={(e) => setNewForm((f) => ({ ...f, sinPeso: e.target.checked }))}
            />
            Sin peso
          </label>
        </div>
        <button
          disabled={busy || !newForm.nombre.trim() || !newForm.grupo}
          onClick={() => {
            onAdd({ ...newForm, nombre: newForm.nombre.trim() });
            setNewForm({ nombre: "", grupo: newForm.grupo, sinPeso: false });
          }}
          className="w-full rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          + Agregar ejercicio
        </button>
      </div>
    </section>
  );
}
