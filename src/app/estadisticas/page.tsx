"use client";

import { useEffect, useMemo, useState } from "react";
import { useCatalog } from "@/lib/CatalogContext";
import { useAuth } from "@/lib/AuthContext";
import { call, UnauthorizedError } from "@/lib/api";
import type { Estadisticas, Periodo, ProgresionPunto } from "@/lib/types";

const PERIODOS: { value: Periodo; label: string }[] = [
  { value: "mes", label: "Este mes" },
  { value: "anio", label: "Este año" },
  { value: "todo", label: "Todo" },
];

export default function EstadisticasPage() {
  const { catalogo } = useCatalog();
  const { logout } = useAuth();

  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const [stats, setStats] = useState<Estadisticas | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    // Fetch-on-period-change; resets are synchronous, the fetch itself isn't.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStats(null);
    setErrorMsg(null);
    call<Estadisticas>("getEstadisticas", { periodo })
      .then(setStats)
      .catch((err) => {
        if (err instanceof UnauthorizedError) logout();
        else setErrorMsg(err instanceof Error ? err.message : "Error al cargar");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodo]);

  const maxPorGrupo = useMemo(
    () => Math.max(1, ...(stats?.porGrupo.map((g) => g.cantidad) ?? [1])),
    [stats],
  );

  const ejerciciosConPeso = catalogo.ejercicios.filter((e) => !e.sinPeso);

  return (
    <div className="mx-auto min-h-screen w-full max-w-2xl px-4 pb-24 pt-4">
      <h1 className="mb-4 text-lg font-semibold text-slate-100">Estadísticas</h1>

      <div className="mb-5 flex gap-2">
        {PERIODOS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriodo(p.value)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${
              periodo === p.value
                ? "bg-emerald-600 text-white"
                : "border border-slate-800 bg-slate-900 text-slate-300"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {errorMsg && (
        <p className="mb-4 rounded-lg bg-red-950 px-3 py-2 text-sm text-red-300">{errorMsg}</p>
      )}

      {!stats && !errorMsg && <p className="text-sm text-slate-500">Cargando...</p>}

      {stats && (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3">
            <StatTile label="Series" value={stats.totales.series} />
            <StatTile label="Sesiones" value={stats.totales.sesiones} />
          </div>

          <section className="mb-6">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Series por grupo muscular
            </h2>
            {stats.porGrupo.length === 0 ? (
              <p className="text-sm text-slate-500">Sin datos en este período.</p>
            ) : (
              <div className="space-y-1.5 rounded-xl border border-slate-800 bg-slate-900 p-3">
                {stats.porGrupo.map((g) => (
                  <div key={g.grupo} className="flex items-center gap-2">
                    <span className="w-24 shrink-0 truncate text-xs text-slate-400">{g.grupo}</span>
                    <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${(g.cantidad / maxPorGrupo) * 100}%` }}
                      />
                    </div>
                    <span className="w-6 shrink-0 text-right text-xs text-slate-400">
                      {g.cantidad}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="mb-6">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Récords personales (histórico)
            </h2>
            {stats.records.length === 0 ? (
              <p className="text-sm text-slate-500">Todavía no hay series con peso registradas.</p>
            ) : (
              <ul className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-900">
                {stats.records.map((r) => (
                  <li key={r.ejercicio} className="flex items-center gap-2 px-3 py-2 text-sm">
                    <span className="min-w-0 flex-1 truncate text-slate-200">{r.ejercicio}</span>
                    <span className="shrink-0 whitespace-nowrap text-right text-xs text-slate-500">
                      <span className="font-semibold text-emerald-400">{r.pesoMax}kg</span>
                      {" · "}
                      {new Date(r.fecha).toLocaleDateString("es-AR", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <ProgresionSection ejercicios={ejerciciosConPeso.map((e) => e.nombre)} />
        </>
      )}
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <p className="text-2xl font-semibold text-slate-100">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}

function ProgresionSection({ ejercicios }: { ejercicios: string[] }) {
  const { logout } = useAuth();
  const [ejercicio, setEjercicio] = useState("");
  const [puntos, setPuntos] = useState<ProgresionPunto[] | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    // Fetch-on-exercise-change; resets are synchronous, the fetch itself isn't.
    if (!ejercicio) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPuntos(null);
      return;
    }
    setPuntos(null);
    setErrorMsg(null);
    call<ProgresionPunto[]>("getProgresion", { ejercicio })
      .then(setPuntos)
      .catch((err) => {
        if (err instanceof UnauthorizedError) logout();
        else setErrorMsg(err instanceof Error ? err.message : "Error al cargar");
      });
  }, [ejercicio, logout]);

  return (
    <section>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Progresión de peso
      </h2>
      <select
        value={ejercicio}
        onChange={(e) => setEjercicio(e.target.value)}
        className="mb-3 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100"
      >
        <option value="">Elegí un ejercicio...</option>
        {ejercicios.map((e) => (
          <option key={e} value={e}>
            {e}
          </option>
        ))}
      </select>

      {errorMsg && <p className="text-sm text-red-400">{errorMsg}</p>}

      {ejercicio && !puntos && !errorMsg && <p className="text-sm text-slate-500">Cargando...</p>}

      {puntos && puntos.length === 0 && (
        <p className="text-sm text-slate-500">No hay series con peso para este ejercicio.</p>
      )}

      {puntos && puntos.length > 0 && <LineChart puntos={puntos} />}
    </section>
  );
}

function LineChart({ puntos }: { puntos: ProgresionPunto[] }) {
  const width = 100;
  const height = 40;
  const padY = 6;
  const pesos = puntos.map((p) => p.pesoMax);
  const min = Math.min(...pesos);
  const max = Math.max(...pesos);
  const range = max - min || 1;

  const coords = puntos.map((p, i) => {
    const x = puntos.length === 1 ? width / 2 : (i / (puntos.length - 1)) * width;
    const y = height - padY - ((p.pesoMax - min) / range) * (height - padY * 2);
    return { x, y, p };
  });

  const path = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x},${c.y}`).join(" ");
  const first = puntos[0];
  const last = puntos[puntos.length - 1];

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="h-24 w-full overflow-visible"
      >
        <path
          d={path}
          fill="none"
          stroke="#10b981"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {coords.map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r="1.6" className="fill-emerald-400">
            <title>
              {c.p.pesoMax}kg ·{" "}
              {new Date(c.p.fecha).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
            </title>
          </circle>
        ))}
      </svg>
      <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
        <span>
          {new Date(first.fecha).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
        </span>
        <span className="font-semibold text-emerald-400">
          máx {max}kg · último {last.pesoMax}kg
        </span>
        <span>
          {new Date(last.fecha).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
        </span>
      </div>
    </div>
  );
}
