import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// Full read-only data dump for external backups/analysis (Google Sheets via
// a time-driven Apps Script, or a spreadsheet fed to an LLM). Same PIN as
// everything else, passed as a query param since the only caller is
// Apps Script's UrlFetchApp doing a plain GET.
type Row = Record<string, unknown>;

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token || token !== process.env.APP_PIN) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  const db = getDb();
  const [grupos, ejercicios, sesiones, series] = await Promise.all([
    db.execute("SELECT id, name AS nombre FROM muscle_groups ORDER BY id"),
    db.execute(
      `SELECT e.id, e.name AS nombre, g.name AS grupo, e.bodyweight AS sinPeso
       FROM exercises e JOIN muscle_groups g ON g.id = e.muscle_group_id
       ORDER BY e.id`
    ),
    db.execute("SELECT id, started_at AS inicio, ended_at AS fin FROM sessions ORDER BY id"),
    db.execute(
      `SELECT id, session_id AS sesionId, logged_at AS fecha, exercise_name AS ejercicio,
              muscle_group_name AS grupo, reps, weight AS peso, notes AS notas
       FROM sets ORDER BY logged_at`
    ),
  ]);

  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    grupos: grupos.rows.map((r) => ({ id: Number((r as Row).id), nombre: String((r as Row).nombre) })),
    ejercicios: ejercicios.rows.map((row) => {
      const r = row as Row;
      return {
        id: Number(r.id),
        nombre: String(r.nombre),
        grupo: String(r.grupo),
        sinPeso: Number(r.sinPeso) === 1,
      };
    }),
    sesiones: sesiones.rows.map((row) => {
      const r = row as Row;
      return { id: Number(r.id), inicio: String(r.inicio), fin: String(r.fin) };
    }),
    series: series.rows.map((row) => {
      const r = row as Row;
      return {
        id: Number(r.id),
        sesionId: Number(r.sesionId),
        fecha: String(r.fecha),
        ejercicio: String(r.ejercicio),
        grupo: String(r.grupo),
        reps: Number(r.reps),
        peso: r.peso === null ? null : Number(r.peso),
        notas: String(r.notas ?? ""),
      };
    }),
  });
}
