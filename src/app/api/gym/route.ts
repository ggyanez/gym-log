import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// A session groups sets from one gym visit. A new set attaches to the most
// recent session if it was touched within this gap, otherwise a new session
// starts — this is what "current session" (surfaced to the client as
// today's log, action "getHoy") means.
const SESSION_GAP_MS = 3 * 60 * 60 * 1000;

type Row = Record<string, unknown>;

export async function POST(req: NextRequest) {
  let body: { token?: string; action?: string; payload?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body inválido" }, { status: 400 });
  }

  if (!body.token || body.token !== process.env.APP_PIN) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" });
  }

  const db = getDb();
  await db.execute("PRAGMA foreign_keys = ON");

  try {
    const data = await route(db, body.action ?? "", body.payload ?? {});
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Error" });
  }
}

async function route(
  db: ReturnType<typeof getDb>,
  action: string,
  payload: Record<string, unknown>,
) {
  switch (action) {
    case "verify":
      return { verified: true };
    case "getCatalogo":
      return getCatalogo(db);
    case "getUltimo":
      return getUltimo(db, String(payload.ejercicio ?? ""));
    case "getHoy":
      return getHoy(db);
    case "addRegistro":
      return addRegistro(db, payload);
    case "editRegistro":
      return editRegistro(db, payload);
    case "deleteRegistro":
      return deleteRegistro(db, Number(payload.row));
    case "addEjercicio":
      return addEjercicio(db, payload);
    case "updateEjercicio":
      return updateEjercicio(db, payload);
    case "deleteEjercicio":
      return deleteEjercicio(db, String(payload.nombre ?? ""));
    case "addGrupo":
      return addGrupo(db, payload);
    case "updateGrupo":
      return updateGrupo(db, payload);
    case "deleteGrupo":
      return deleteGrupo(db, String(payload.nombre ?? ""));
    case "getHistorial":
      return getHistorial(db, payload);
    case "getEstadisticas":
      return getEstadisticas(db, String(payload.periodo ?? "todo"));
    case "getProgresion":
      return getProgresion(db, String(payload.ejercicio ?? ""));
    default:
      throw new Error(`Acción desconocida: ${action}`);
  }
}

// ---------- catálogo ----------

async function getCatalogo(db: ReturnType<typeof getDb>) {
  const [grupos, ejercicios] = await Promise.all([
    db.execute("SELECT name FROM muscle_groups ORDER BY id"),
    db.execute(
      `SELECT e.name AS nombre, g.name AS grupo, e.bodyweight AS sinPeso
       FROM exercises e JOIN muscle_groups g ON g.id = e.muscle_group_id
       ORDER BY e.id`,
    ),
  ]);
  return {
    grupos: grupos.rows.map((r: Row) => String(r.name)),
    ejercicios: ejercicios.rows.map((r: Row) => ({
      nombre: String(r.nombre),
      grupo: String(r.grupo),
      sinPeso: Number(r.sinPeso) === 1,
    })),
  };
}

// ---------- registros ----------

async function findExercise(db: ReturnType<typeof getDb>, nombre: string) {
  const res = await db.execute({
    sql: `SELECT e.id, e.name AS nombre, g.name AS grupo, e.bodyweight AS sinPeso
          FROM exercises e JOIN muscle_groups g ON g.id = e.muscle_group_id
          WHERE e.name = ?`,
    args: [nombre],
  });
  if (res.rows.length === 0) return null;
  const r = res.rows[0] as Row;
  return {
    id: Number(r.id),
    nombre: String(r.nombre),
    grupo: String(r.grupo),
    sinPeso: Number(r.sinPeso) === 1,
  };
}

async function getUltimo(db: ReturnType<typeof getDb>, ejercicio: string) {
  if (!ejercicio) throw new Error("Falta ejercicio");
  const res = await db.execute({
    sql: `SELECT logged_at, reps, weight, notes FROM sets
          WHERE exercise_name = ? ORDER BY logged_at DESC LIMIT 1`,
    args: [ejercicio],
  });
  if (res.rows.length === 0) return null;
  const r = res.rows[0] as Row;
  return {
    fecha: String(r.logged_at),
    reps: r.reps === null ? null : Number(r.reps),
    peso: r.weight === null ? null : Number(r.weight),
    notas: String(r.notes ?? ""),
  };
}

async function currentSessionId(db: ReturnType<typeof getDb>) {
  const res = await db.execute("SELECT id, ended_at FROM sessions ORDER BY ended_at DESC LIMIT 1");
  if (res.rows.length === 0) return null;
  const r = res.rows[0] as Row;
  const gapMs = Date.now() - new Date(String(r.ended_at)).getTime();
  return gapMs < SESSION_GAP_MS ? Number(r.id) : null;
}

async function resolveSessionId(db: ReturnType<typeof getDb>) {
  const nowIso = new Date().toISOString();
  const existing = await currentSessionId(db);
  if (existing !== null) {
    await db.execute({
      sql: "UPDATE sessions SET ended_at = ? WHERE id = ?",
      args: [nowIso, existing],
    });
    return existing;
  }
  const created = await db.execute({
    sql: "INSERT INTO sessions (started_at, ended_at) VALUES (?, ?) RETURNING id",
    args: [nowIso, nowIso],
  });
  return Number((created.rows[0] as Row).id);
}

async function getHoy(db: ReturnType<typeof getDb>) {
  const sessionId = await currentSessionId(db);
  if (sessionId === null) return [];
  const res = await db.execute({
    sql: `SELECT id, muscle_group_name, exercise_name, reps, weight, notes
          FROM sets WHERE session_id = ? ORDER BY logged_at DESC`,
    args: [sessionId],
  });
  return res.rows.map((row) => {
    const r = row as Row;
    return {
      row: Number(r.id),
      grupo: String(r.muscle_group_name),
      ejercicio: String(r.exercise_name),
      reps: Number(r.reps),
      peso: r.weight === null ? "-" : Number(r.weight),
      notas: String(r.notes ?? ""),
    };
  });
}

async function addRegistro(db: ReturnType<typeof getDb>, payload: Record<string, unknown>) {
  const ejercicio = String(payload.ejercicio ?? "");
  if (!ejercicio) throw new Error("Falta ejercicio");
  const info = await findExercise(db, ejercicio);
  if (!info) throw new Error(`Ejercicio no encontrado en el catálogo: ${ejercicio}`);

  const reps = payload.reps;
  if (reps === undefined || reps === null || reps === "")
    throw new Error("Faltan las repeticiones");

  const peso = info.sinPeso ? null : payload.peso;
  if (!info.sinPeso && (peso === undefined || peso === null || peso === "")) {
    throw new Error("Falta el peso");
  }

  const notas = payload.notas ? String(payload.notas) : null;
  const nowIso = new Date().toISOString();
  const sessionId = await resolveSessionId(db);

  const res = await db.execute({
    sql: `INSERT INTO sets
      (session_id, exercise_id, exercise_name, muscle_group_name, reps, weight, notes, logged_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
    args: [
      sessionId,
      info.id,
      info.nombre,
      info.grupo,
      Number(reps),
      peso === null ? null : Number(peso),
      notas,
      nowIso,
    ],
  });

  return {
    row: Number((res.rows[0] as Row).id),
    fecha: nowIso,
    grupo: info.grupo,
    sinPeso: info.sinPeso,
  };
}

async function editRegistro(db: ReturnType<typeof getDb>, payload: Record<string, unknown>) {
  const id = Number(payload.row);
  if (!id) throw new Error("Fila inválida");
  await db.execute({
    sql: `UPDATE sets SET reps = ?, notes = ?,
          weight = CASE WHEN weight IS NULL THEN NULL ELSE ? END
          WHERE id = ?`,
    args: [
      Number(payload.reps),
      payload.notas ? String(payload.notas) : null,
      Number(payload.peso),
      id,
    ],
  });
  return { row: id };
}

async function deleteRegistro(db: ReturnType<typeof getDb>, id: number) {
  if (!id) throw new Error("Fila inválida");
  await db.execute({ sql: "DELETE FROM sets WHERE id = ?", args: [id] });
  return { deleted: id };
}

// ---------- ejercicios (ABM) ----------

async function findGrupoId(db: ReturnType<typeof getDb>, nombre: string) {
  const res = await db.execute({
    sql: "SELECT id FROM muscle_groups WHERE name = ?",
    args: [nombre],
  });
  return res.rows.length ? Number((res.rows[0] as Row).id) : null;
}

async function addEjercicio(db: ReturnType<typeof getDb>, payload: Record<string, unknown>) {
  const nombre = String(payload.nombre ?? "").trim();
  const grupo = String(payload.grupo ?? "").trim();
  if (!nombre || !grupo) throw new Error("Nombre y grupo son obligatorios");
  const grupoId = await findGrupoId(db, grupo);
  if (!grupoId) throw new Error("El grupo no existe");
  try {
    await db.execute({
      sql: "INSERT INTO exercises (name, muscle_group_id, bodyweight) VALUES (?, ?, ?)",
      args: [nombre, grupoId, payload.sinPeso ? 1 : 0],
    });
  } catch {
    throw new Error("Ya existe un ejercicio con ese nombre");
  }
  return { nombre };
}

async function updateEjercicio(db: ReturnType<typeof getDb>, payload: Record<string, unknown>) {
  const original = String(payload.nombreOriginal ?? "");
  const nombre = String(payload.nombre ?? "").trim();
  const grupo = String(payload.grupo ?? "").trim();
  if (!nombre || !grupo) throw new Error("Nombre y grupo son obligatorios");
  const grupoId = await findGrupoId(db, grupo);
  if (!grupoId) throw new Error("El grupo no existe");
  const res = await db.execute({
    sql: "UPDATE exercises SET name = ?, muscle_group_id = ?, bodyweight = ? WHERE name = ?",
    args: [nombre, grupoId, payload.sinPeso ? 1 : 0, original],
  });
  if (res.rowsAffected === 0) throw new Error("Ejercicio no encontrado");
  return { nombre };
}

async function deleteEjercicio(db: ReturnType<typeof getDb>, nombre: string) {
  const res = await db.execute({ sql: "DELETE FROM exercises WHERE name = ?", args: [nombre] });
  if (res.rowsAffected === 0) throw new Error("Ejercicio no encontrado");
  return { deleted: nombre };
}

// ---------- grupos (ABM) ----------

async function addGrupo(db: ReturnType<typeof getDb>, payload: Record<string, unknown>) {
  const nombre = String(payload.nombre ?? "").trim();
  if (!nombre) throw new Error("El nombre es obligatorio");
  try {
    await db.execute({ sql: "INSERT INTO muscle_groups (name) VALUES (?)", args: [nombre] });
  } catch {
    throw new Error("Ya existe ese grupo");
  }
  return { nombre };
}

async function updateGrupo(db: ReturnType<typeof getDb>, payload: Record<string, unknown>) {
  const original = String(payload.nombreOriginal ?? "");
  const nombre = String(payload.nombre ?? "").trim();
  if (!nombre) throw new Error("El nombre es obligatorio");
  const res = await db.execute({
    sql: "UPDATE muscle_groups SET name = ? WHERE name = ?",
    args: [nombre, original],
  });
  if (res.rowsAffected === 0) throw new Error("Grupo no encontrado");
  return { nombre };
}

async function deleteGrupo(db: ReturnType<typeof getDb>, nombre: string) {
  const grupoId = await findGrupoId(db, nombre);
  if (!grupoId) throw new Error("Grupo no encontrado");
  const inUse = await db.execute({
    sql: "SELECT COUNT(*) AS n FROM exercises WHERE muscle_group_id = ?",
    args: [grupoId],
  });
  if (Number((inUse.rows[0] as Row).n) > 0) {
    throw new Error("Hay ejercicios usando este grupo. Reasigná o borrá esos ejercicios primero.");
  }
  await db.execute({ sql: "DELETE FROM muscle_groups WHERE id = ?", args: [grupoId] });
  return { deleted: nombre };
}

// ---------- historial ----------

const HISTORIAL_PAGE_SIZE = 30;

async function getHistorial(db: ReturnType<typeof getDb>, payload: Record<string, unknown>) {
  const fecha = payload.fecha ? String(payload.fecha) : null;
  const ejercicio = payload.ejercicio ? String(payload.ejercicio) : null;
  const grupo = payload.grupo ? String(payload.grupo) : null;
  const offset = Number(payload.offset ?? 0);

  const conditions: string[] = [];
  const args: (string | number)[] = [];
  if (fecha) {
    conditions.push("date(sets.logged_at) = ?");
    args.push(fecha);
  }
  if (ejercicio) {
    conditions.push("sets.exercise_name = ?");
    args.push(ejercicio);
  }
  if (grupo) {
    conditions.push("sets.muscle_group_name = ?");
    args.push(grupo);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const [rows, count] = await Promise.all([
    db.execute({
      sql: `SELECT sets.id, sets.session_id, sets.logged_at, sets.exercise_name,
              sets.muscle_group_name, sets.reps, sets.weight, sets.notes
            FROM sets
            ${where}
            ORDER BY sets.logged_at DESC
            LIMIT ${HISTORIAL_PAGE_SIZE} OFFSET ${offset}`,
      args,
    }),
    db.execute({ sql: `SELECT COUNT(*) AS n FROM sets ${where}`, args }),
  ]);

  return {
    total: Number((count.rows[0] as Row).n),
    series: rows.rows.map((row) => {
      const r = row as Row;
      return {
        row: Number(r.id),
        sessionId: Number(r.session_id),
        fecha: String(r.logged_at),
        grupo: String(r.muscle_group_name),
        ejercicio: String(r.exercise_name),
        reps: Number(r.reps),
        peso: r.weight === null ? "-" : Number(r.weight),
        notas: String(r.notes ?? ""),
      };
    }),
  };
}

// ---------- estadísticas ----------

function periodoDesde(periodo: string): string | null {
  const now = new Date();
  if (periodo === "mes") {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  }
  if (periodo === "anio") {
    return new Date(Date.UTC(now.getUTCFullYear(), 0, 1)).toISOString();
  }
  return null;
}

async function getEstadisticas(db: ReturnType<typeof getDb>, periodo: string) {
  const desde = periodoDesde(periodo);
  const whereDesde = desde ? "WHERE logged_at >= ?" : "";
  const args = desde ? [desde] : [];

  const [porGrupo, totales, records] = await Promise.all([
    db.execute({
      sql: `SELECT muscle_group_name, COUNT(*) AS cantidad FROM sets ${whereDesde}
            GROUP BY muscle_group_name ORDER BY cantidad DESC`,
      args,
    }),
    db.execute({
      sql: `SELECT COUNT(*) AS series, COUNT(DISTINCT session_id) AS sesiones FROM sets ${whereDesde}`,
      args,
    }),
    // Récords personales: siempre históricos (todo el tiempo), sin importar
    // el período elegido — un "récord" no tiene sentido acotado a un mes.
    db.execute(
      `SELECT exercise_name, weight, logged_at FROM (
         SELECT exercise_name, weight, logged_at,
                ROW_NUMBER() OVER (
                  PARTITION BY exercise_name
                  ORDER BY weight DESC, reps DESC, logged_at DESC
                ) AS rn
         FROM sets WHERE weight IS NOT NULL
       ) WHERE rn = 1
       ORDER BY exercise_name`,
    ),
  ]);

  const t = totales.rows[0] as Row;
  return {
    porGrupo: porGrupo.rows.map((row) => {
      const r = row as Row;
      return { grupo: String(r.muscle_group_name), cantidad: Number(r.cantidad) };
    }),
    totales: { series: Number(t.series), sesiones: Number(t.sesiones) },
    records: records.rows.map((row) => {
      const r = row as Row;
      return {
        ejercicio: String(r.exercise_name),
        pesoMax: Number(r.weight),
        fecha: String(r.logged_at),
      };
    }),
  };
}

async function getProgresion(db: ReturnType<typeof getDb>, ejercicio: string) {
  if (!ejercicio) throw new Error("Falta ejercicio");
  const res = await db.execute({
    sql: `SELECT session_id, MAX(weight) AS pesoMax, MIN(logged_at) AS fecha
          FROM sets WHERE exercise_name = ? AND weight IS NOT NULL
          GROUP BY session_id
          ORDER BY fecha ASC`,
    args: [ejercicio],
  });
  return res.rows.map((row) => {
    const r = row as Row;
    return { fecha: String(r.fecha), pesoMax: Number(r.pesoMax) };
  });
}
