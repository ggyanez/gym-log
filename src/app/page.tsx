"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useCatalog } from "@/lib/CatalogContext";
import { useAuth } from "@/lib/AuthContext";
import { call, UnauthorizedError } from "@/lib/api";
import { normalize } from "@/lib/normalize";
import type { Ejercicio, RegistroHoy, Ultimo } from "@/lib/types";
import ExerciseChip from "@/components/ExerciseChip";
import NumberStepper from "@/components/NumberStepper";

const PLANILLA_URL =
  "https://docs.google.com/spreadsheets/d/16kNOXXGa3DcAREFZiJtHUCmIHRtnXybojoBiq9TDa0Q";

const hoyLegible = new Date().toLocaleDateString("es-AR", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

export default function Page() {
  const { catalogo, loading: loadingCatalogo, error: catalogError } = useCatalog();
  const { logout } = useAuth();

  const [todayLog, setTodayLog] = useState<RegistroHoy[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Ejercicio | null>(null);
  const [reps, setReps] = useState("");
  const [peso, setPeso] = useState("");
  const [notas, setNotas] = useState("");
  const [notasOpen, setNotasOpen] = useState(false);
  const [ultimo, setUltimo] = useState<Ultimo>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    call<RegistroHoy[]>("getHoy")
      .then(setTodayLog)
      .catch((err) => {
        if (err instanceof UnauthorizedError) logout();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const countsHoy = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of todayLog) m.set(r.ejercicio, (m.get(r.ejercicio) ?? 0) + 1);
    return m;
  }, [todayLog]);

  const recientes = useMemo(() => {
    const seen = new Set<string>();
    const list: Ejercicio[] = [];
    for (const r of todayLog) {
      if (seen.has(r.ejercicio)) continue;
      seen.add(r.ejercicio);
      const ej = catalogo.ejercicios.find((e) => e.nombre === r.ejercicio);
      if (ej) list.push(ej);
      if (list.length >= 6) break;
    }
    return list;
  }, [todayLog, catalogo.ejercicios]);

  const grouped = useMemo(() => {
    const q = normalize(search);
    const filtered = q
      ? catalogo.ejercicios.filter(
          (e) => normalize(e.nombre).includes(q) || normalize(e.grupo).includes(q),
        )
      : catalogo.ejercicios;

    const byGroup = new Map<string, Ejercicio[]>();
    for (const grupo of catalogo.grupos) byGroup.set(grupo, []);
    for (const e of filtered) {
      if (!byGroup.has(e.grupo)) byGroup.set(e.grupo, []);
      byGroup.get(e.grupo)!.push(e);
    }
    return Array.from(byGroup.entries()).filter(([, list]) => list.length > 0);
  }, [catalogo, search]);

  function selectExercise(ej: Ejercicio) {
    setSelected(ej);
    setErrorMsg(null);
    setNotas("");
    setNotasOpen(false);
    setReps("");
    setPeso("");
    setUltimo(null);
    call<Ultimo>("getUltimo", { ejercicio: ej.nombre })
      .then((u) => {
        setUltimo(u);
        if (u?.reps != null) setReps(String(u.reps));
        if (u?.peso != null) setPeso(String(u.peso));
      })
      .catch((err) => {
        if (err instanceof UnauthorizedError) logout();
      });
  }

  function markSaved(entry: RegistroHoy) {
    setTodayLog((prev) => [entry, ...prev]);
    setNotas("");
    setNotasOpen(false);
    setToast("Serie registrada ✓");
    setTimeout(() => setToast(null), 1500);
  }

  async function submit() {
    if (!selected) return;
    if (!reps) {
      setErrorMsg("Ingresá las repeticiones");
      return;
    }
    if (!selected.sinPeso && !peso) {
      setErrorMsg("Ingresá el peso");
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);
    const attempted = {
      ejercicio: selected.nombre,
      grupo: selected.grupo,
      reps: Number(reps),
      peso: selected.sinPeso ? ("-" as const) : Number(peso),
      notas,
    };
    try {
      const data = await call<{ row: number }>("addRegistro", {
        ejercicio: attempted.ejercicio,
        reps: attempted.reps,
        peso: selected.sinPeso ? null : attempted.peso,
        notas,
      });
      markSaved({ row: data.row, ...attempted });
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        logout();
        return;
      }
      // Apps Script sometimes fails to deliver the response even though the
      // write went through (see addRegistro's transient-404 note). Check
      // today's log before showing an error, so a flaky response doesn't
      // make us tell the user to retry into a duplicate row.
      try {
        const hoy = await call<RegistroHoy[]>("getHoy");
        const alreadySaved = hoy.find(
          (r) =>
            r.ejercicio === attempted.ejercicio &&
            Number(r.reps) === attempted.reps &&
            String(r.peso) === String(attempted.peso) &&
            !todayLog.some((t) => t.row === r.row),
        );
        if (alreadySaved) markSaved(alreadySaved);
        else setErrorMsg(err instanceof Error ? err.message : "Error al guardar");
      } catch {
        setErrorMsg(err instanceof Error ? err.message : "Error al guardar");
      }
    } finally {
      setSubmitting(false);
    }
  }

  function deleteRow(row: number) {
    call("deleteRegistro", { row })
      .then(() => setTodayLog((prev) => prev.filter((r) => r.row !== row)))
      .catch((err) => {
        if (err instanceof UnauthorizedError) logout();
      });
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto w-full max-w-5xl px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-base font-semibold text-slate-100 first-letter:uppercase">
                {hoyLegible}
              </h1>
              <p className="text-xs text-slate-500">
                {todayLog.length > 0
                  ? `${todayLog.length} series registradas hoy`
                  : "Elegí un ejercicio para arrancar"}
              </p>
              <a
                href={PLANILLA_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-0.5 inline-block text-xs text-emerald-400 underline underline-offset-2"
              >
                Abrir planilla ↗
              </a>
            </div>
            <Link
              href="/manage"
              aria-label="Gestionar ejercicios y grupos"
              className="rounded-lg p-2 text-xl text-slate-400 active:scale-95"
            >
              ⚙️
            </Link>
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar ejercicio..."
            className="mt-3 w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-slate-100 outline-none focus:border-emerald-500 lg:max-w-md"
          />
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col lg:flex-row lg:gap-8">
        <main className={`min-w-0 flex-1 px-4 pt-4 lg:pb-8 ${selected ? "pb-80" : "pb-8"}`}>
          {catalogError && (
            <p className="mb-4 rounded-lg bg-red-950 px-3 py-2 text-sm text-red-300">
              {catalogError}
            </p>
          )}

          {!loadingCatalogo && catalogo.ejercicios.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-800 p-6 text-center text-sm text-slate-400">
              Todavía no hay ejercicios cargados.{" "}
              <Link href="/manage" className="text-emerald-400 underline">
                Agregá el primero
              </Link>
              .
            </div>
          )}

          {recientes.length > 0 && !search && (
            <section className="mb-5">
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Recientes de hoy
              </h2>
              <div className="flex flex-wrap gap-2">
                {recientes.map((ej) => (
                  <ExerciseChip
                    key={ej.nombre}
                    nombre={ej.nombre}
                    active={selected?.nombre === ej.nombre}
                    count={countsHoy.get(ej.nombre) ?? 0}
                    onClick={() => selectExercise(ej)}
                  />
                ))}
              </div>
            </section>
          )}

          {grouped.map(([grupo, ejercicios]) => (
            <section key={grupo} className="mb-5">
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {grupo}
              </h2>
              <div className="flex flex-wrap gap-2">
                {ejercicios.map((ej) => (
                  <ExerciseChip
                    key={ej.nombre}
                    nombre={ej.nombre}
                    active={selected?.nombre === ej.nombre}
                    count={countsHoy.get(ej.nombre) ?? 0}
                    onClick={() => selectExercise(ej)}
                  />
                ))}
              </div>
            </section>
          ))}

          <section className="mt-6 border-t border-slate-800 pt-4">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Series de hoy ({todayLog.length})
            </h2>
            {todayLog.length === 0 ? (
              <p className="text-sm text-slate-500">Todavía no registraste ninguna serie.</p>
            ) : (
              <ul className="space-y-1.5">
                {todayLog.map((r) => (
                  <li
                    key={r.row}
                    className="flex items-center justify-between gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-200">{r.ejercicio}</p>
                      <p className="text-xs text-slate-500">
                        {r.reps} reps{r.peso !== "-" ? ` · ${r.peso}kg` : ""}
                        {r.notas ? ` · ${r.notas}` : ""}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteRow(r.row)}
                      aria-label="Borrar serie"
                      className="shrink-0 px-2 text-slate-500 active:scale-95"
                    >
                      🗑
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </main>

        <aside className="lg:w-96 lg:shrink-0 lg:px-4 lg:pt-4">
          <div className="lg:sticky lg:top-40">
            {!selected && (
              <div className="hidden rounded-2xl border border-dashed border-slate-800 p-8 text-center text-sm text-slate-500 lg:block">
                Elegí un ejercicio para registrar una serie.
              </div>
            )}

            {toast && (
              <div className="fixed left-1/2 top-4 z-40 -translate-x-1/2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-lg">
                {toast}
              </div>
            )}

            {selected && (
              <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-800 bg-slate-900 px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-3 shadow-2xl lg:static lg:z-auto lg:rounded-2xl lg:border lg:p-5 lg:shadow-none">
                <div className="mb-3 flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-100">
                      {selected.nombre}
                    </p>
                    <p className="text-xs text-slate-500">
                      {selected.grupo}
                      {ultimo &&
                        ` · última vez: ${ultimo.reps ?? "-"} reps${
                          ultimo.peso != null ? ` · ${ultimo.peso}kg` : ""
                        }`}
                    </p>
                    {ultimo?.notas && (
                      <p className="mt-1 max-h-16 overflow-y-auto whitespace-pre-wrap break-words text-xs italic text-amber-300/80 lg:max-h-none">
                        Nota: {ultimo.notas}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setSelected(null)}
                    aria-label="Cerrar"
                    className="shrink-0 px-2 text-lg text-slate-500"
                  >
                    ✕
                  </button>
                </div>

                <div
                  className={`grid gap-3 ${selected.sinPeso ? "grid-cols-1" : "grid-cols-2 lg:grid-cols-1"}`}
                >
                  <NumberStepper label="Reps" value={reps} onChange={setReps} step={1} />
                  {!selected.sinPeso && (
                    <NumberStepper
                      label="Peso (kg)"
                      value={peso}
                      onChange={setPeso}
                      step={1}
                      decimal
                    />
                  )}
                </div>

                {notasOpen ? (
                  <textarea
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    placeholder="Nota (opcional)"
                    rows={2}
                    className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
                  />
                ) : (
                  <button
                    onClick={() => setNotasOpen(true)}
                    className="mt-3 text-xs text-slate-500 underline"
                  >
                    + Agregar nota
                  </button>
                )}

                {errorMsg && <p className="mt-2 text-sm text-red-400">{errorMsg}</p>}

                <button
                  onClick={submit}
                  disabled={submitting}
                  className="mt-3 w-full rounded-xl bg-emerald-600 py-3.5 text-lg font-semibold text-white transition active:scale-[0.98] disabled:opacity-50"
                >
                  {submitting ? "Guardando..." : "Registrar serie"}
                </button>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
