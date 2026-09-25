"use client";

import { useEffect, useState } from "react";
import { useCatalog } from "@/lib/CatalogContext";
import { useAuth } from "@/lib/AuthContext";
import { call, UnauthorizedError } from "@/lib/api";
import type { Historial, RegistroHistorial } from "@/lib/types";

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function HistorialPage() {
  const { catalogo } = useCatalog();
  const { logout } = useAuth();

  const [fecha, setFecha] = useState("");
  const [ejercicio, setEjercicio] = useState("");
  const [grupo, setGrupo] = useState("");

  const [series, setSeries] = useState<RegistroHistorial[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function load(offset: number, append: boolean) {
    setLoading(true);
    setErrorMsg(null);
    call<Historial>("getHistorial", {
      fecha: fecha || undefined,
      ejercicio: ejercicio || undefined,
      grupo: grupo || undefined,
      offset,
    })
      .then((data) => {
        setSeries((prev) => (append ? [...prev, ...data.series] : data.series));
        setTotal(data.total);
      })
      .catch((err) => {
        if (err instanceof UnauthorizedError) logout();
        else setErrorMsg(err instanceof Error ? err.message : "Error al cargar");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    // Fetch-on-filter-change; load() sets loading state synchronously
    // before its internal await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(0, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fecha, ejercicio, grupo]);

  const hayFiltros = !!(fecha || ejercicio || grupo);

  return (
    <div className="mx-auto min-h-screen w-full max-w-2xl px-4 pb-24 pt-4">
      <h1 className="mb-4 text-lg font-semibold text-slate-100">Historial</h1>

      <div className="mb-4 space-y-2 rounded-xl border border-slate-800 bg-slate-900 p-3">
        <div className="flex gap-2">
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-sm text-slate-100"
          />
          {hayFiltros && (
            <button
              onClick={() => {
                setFecha("");
                setEjercicio("");
                setGrupo("");
              }}
              className="shrink-0 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-400"
            >
              Limpiar
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <select
            value={grupo}
            onChange={(e) => {
              setGrupo(e.target.value);
              setEjercicio("");
            }}
            className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-sm text-slate-100"
          >
            <option value="">Todos los grupos</option>
            {catalogo.grupos.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <select
            value={ejercicio}
            onChange={(e) => setEjercicio(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-sm text-slate-100"
          >
            <option value="">Todos los ejercicios</option>
            {catalogo.ejercicios
              .filter((ej) => !grupo || ej.grupo === grupo)
              .map((ej) => (
                <option key={ej.nombre} value={ej.nombre}>
                  {ej.nombre}
                </option>
              ))}
          </select>
        </div>
      </div>

      {errorMsg && (
        <p className="mb-4 rounded-lg bg-red-950 px-3 py-2 text-sm text-red-300">{errorMsg}</p>
      )}

      {!loading && series.length === 0 && !errorMsg && (
        <p className="text-sm text-slate-500">No hay series que coincidan con el filtro.</p>
      )}

      <SeriesAgrupadas series={series} />

      {series.length < total && (
        <button
          onClick={() => load(series.length, true)}
          disabled={loading}
          className="mt-4 w-full rounded-lg border border-slate-800 py-2.5 text-sm text-slate-300 disabled:opacity-50"
        >
          {loading ? "Cargando..." : `Cargar más (${series.length}/${total})`}
        </button>
      )}
    </div>
  );
}

function SeriesAgrupadas({ series }: { series: RegistroHistorial[] }) {
  const conMarca = series.map((r, i) => ({
    r,
    nuevaSesion: i === 0 || series[i - 1].sessionId !== r.sessionId,
  }));

  return (
    <div className="space-y-1.5">
      {conMarca.map(({ r, nuevaSesion }) => {
        return (
          <div key={r.row}>
            {nuevaSesion && (
              <h2 className="mb-1.5 mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500 first:mt-0 capitalize">
                {formatFecha(r.fecha)}
              </h2>
            )}
            <div className="rounded-lg bg-slate-900 px-3 py-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-slate-200">{r.ejercicio}</p>
                <span className="shrink-0 text-xs text-slate-500">{r.grupo}</span>
              </div>
              <p className="text-xs text-slate-500">
                {r.reps} reps{r.peso !== "-" ? ` · ${r.peso}kg` : ""}
                {r.notas ? ` · ${r.notas}` : ""}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
