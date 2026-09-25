// One-off migration: seeds the Turso database with the current Google Sheet
// catalog (Grupos/Ejercicios) and historical Registros. Run once with:
//   TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... node db/migrate.mjs
import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) {
  throw new Error("Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN");
}
const db = createClient({ url, authToken });

const GRUPOS = [
  "Espalda",
  "Pecho",
  "Hombros",
  "Biceps",
  "Triceps",
  "Antebrazos",
  "Abdominales",
  "Piernas",
  "Glúteos",
];

// [nombre, grupo, sinPeso]
const EJERCICIOS = [
  ["Dominadas asistidas", "Espalda", true],
  ["Press banco inclinado", "Pecho", false],
  ["Remo inclinado", "Espalda", false],
  ["Press banco plano", "Pecho", false],
  ["Curl Supinado", "Biceps", false],
  ["Skull Crusher", "Triceps", false],
  ["Vuelos Laterales", "Hombros", false],
  ["Pájaros", "Hombros", false],
  ["Curl Inverso", "Antebrazos", false],
  ["Crunches (C-Shape)", "Abdominales", true],
  ["Levantamiento de piernas (C-Shape)", "Abdominales", true],
  ["Extensión trasnuca a 1 mancuerna", "Triceps", false],
];

// Historical Registros, grouped by date exactly as in the Sheet, dropping
// the old free-text "Grupo Muscular" column — muscle group is derived fresh
// from EJERCICIOS below instead. [ejercicio, reps, peso ("-" = sin peso), notas]
const SESIONES = [
  {
    fecha: "2026-09-01",
    series: [
      ["Dominadas asistidas", 7, "-", ""],
      ["Press banco inclinado", 12, 16, ""],
      ["Dominadas asistidas", 5, "-", ""],
      ["Press banco inclinado", 12, 24, ""],
      ["Dominadas asistidas", 4, "-", ""],
      ["Press banco inclinado", 12, 24, "Creo que puedo meterle mas peso"],
      ["Remo inclinado", 12, 32, ""],
      ["Press banco plano", 11, 32, ""],
      ["Remo inclinado", 12, 32, ""],
      ["Press banco plano", 8, 32, ""],
      ["Remo inclinado", 8, 32, "Me quedé sin aire"],
      ["Press banco plano", 7, 32, "Fallo muscular"],
      ["Curl Supinado", 14, 8, ""],
      ["Skull Crusher", 12, 8, ""],
      ["Curl Supinado", 12, 16, ""],
      ["Skull Crusher", 7, 16, "Fallo muscular"],
      ["Vuelos Laterales", 12, 4, "Podría aumentar"],
      ["Pájaros", 8, 4, "Primera vez q hago el ejercicio, esta bien el peso"],
      ["Curl Inverso", 20, 4, "Es poco peso"],
      ["Vuelos Laterales", 13, 4, "Esta bien el peso, podria hacer superserie con pajaros"],
      ["Pájaros", 6, 4, ""],
      ["Curl Inverso", 22, 4, "Separar el ejercicio del superset y subirle peso"],
    ],
  },
  {
    fecha: "2026-09-07",
    series: [
      ["Dominadas asistidas", 7, "-", ""],
      ["Press banco inclinado", 14, 24, ""],
      [
        "Dominadas asistidas",
        5,
        "-",
        "Se rompió la bandita naranja asi que ahora estoy con menos asistencia",
      ],
      ["Press banco inclinado", 15, 24, ""],
      [
        "Dominadas asistidas",
        3,
        "-",
        "Ver si me sirve hacer negativas, o de que manera puedo progresar (mas bandas tal vez? si es asi, preguntar cuales a la IA, que me haga el calculo)",
      ],
      ["Press banco inclinado", 14, 24, "Subirle"],
      ["Remo inclinado", 13, 32, ""],
      ["Press banco plano", 9, 32, ""],
      ["Remo inclinado", 13, 32, ""],
      ["Press banco plano", 6, 32, ""],
      ["Remo inclinado", 11, 32, ""],
      ["Press banco plano", 7, 32, ""],
      [
        "Curl Supinado",
        12,
        16,
        "Fallo por aire, incluso habiendo descansado 2 min de la serie anterior",
      ],
      ["Skull Crusher", 6, 16, ""],
      ["Curl Supinado", 9, 16, ""],
      ["Curl Inverso", 16, 8, ""],
      ["Crunches (C-Shape)", 15, "-", ""],
      ["Curl Supinado", 17, 8, ""],
      ["Crunches (C-Shape)", 10, "-", ""],
    ],
  },
  {
    fecha: "2026-09-18",
    series: [
      ["Dominadas asistidas", 5, "-", ""],
      ["Press banco inclinado", 10, 32, ""],
      ["Dominadas asistidas", 4, "-", ""],
      ["Press banco inclinado", 8, 32, ""],
      ["Dominadas asistidas", 4, "-", ""],
      ["Press banco inclinado", 7, 32, ""],
      ["Remo inclinado", 13, 32, ""],
      ["Press banco plano", 8, 32, ""],
      ["Remo inclinado", 12, 32, ""],
      ["Press banco plano", 7, 32, ""],
      ["Remo inclinado", 11, 32, ""],
      [
        "Press banco plano",
        5,
        32,
        "Tiene sentido haber hecho menos que en sesion anterior porque aumenté el peso de banco inclinado esta sesión.",
      ],
      [
        "Skull Crusher",
        6,
        16,
        "Cambiar a extension trasnuca con mismo peso que una de las mancuernas de biceps",
      ],
      ["Curl Supinado", 15, 16, "Fallo por aire - la proxima sesion subir de peso"],
      ["Levantamiento de piernas (C-Shape)", 8, "-", ""],
      [
        "Skull Crusher",
        6,
        16,
        "Cambiar a extension trasnuca con mismo peso que una de las mancuernas de biceps",
      ],
      ["Curl Supinado", 13, 16, "Subir el peso"],
      ["Curl Inverso", 13, 16, ""],
      ["Vuelos Laterales", 8, 8, ""],
      ["Curl Inverso", 16, 8, ""],
      [
        "Vuelos Laterales",
        8,
        8,
        "Esta bien el peso, no es la tecnica más prolija, pero tengo que ir acostumbrando el hombro a este peso, sino no subo mas",
      ],
    ],
  },
  {
    fecha: "2026-09-25",
    series: [
      ["Dominadas asistidas", 5, "-", ""],
      ["Press banco inclinado", 11, 32, ""],
      ["Dominadas asistidas", 5, "-", ""],
      ["Press banco inclinado", 9, 32, ""],
      ["Dominadas asistidas", 5, "-", ""],
      ["Press banco inclinado", 8, 32, ""],
      ["Remo inclinado", 13, 32, ""],
      ["Press banco plano", 9, 32, ""],
      ["Remo inclinado", 14, 32, ""],
      ["Press banco plano", 5, 32, ""],
      ["Remo inclinado", 12, 32, ""],
      ["Press banco plano", 7, 32, ""],
      ["Curl Supinado", 6, 24, ""],
      ["Extensión trasnuca a 1 mancuerna", 15, 12, ""],
      ["Curl Supinado", 6, 24, ""],
      ["Extensión trasnuca a 1 mancuerna", 12, 12, ""],
      ["Curl Inverso", 13, 8, ""],
      ["Vuelos Laterales", 10, 8, ""],
      ["Curl Inverso", 16, 8, ""],
      ["Vuelos Laterales", 10, 8, ""],
    ],
  },
];

function syntheticTimestamp(fecha, index) {
  // No time-of-day exists in the old Sheet data — synthesize an early
  // morning session (10:00 UTC = 07:00 ART) with sets 3 minutes apart, in
  // original logging order, purely so ORDER BY logged_at stays correct.
  // Deliberately early: the most recent date here can be *today*, and this
  // must stay safely before the real current time or it'll sort as if it
  // happened in the future relative to a set logged for real right now.
  const d = new Date(`${fecha}T10:00:00.000Z`);
  d.setUTCMinutes(d.getUTCMinutes() + index * 3);
  return d.toISOString();
}

async function main() {
  const grupoId = {};
  for (const nombre of GRUPOS) {
    const res = await db.execute({
      sql: "INSERT INTO muscle_groups (name) VALUES (?) RETURNING id",
      args: [nombre],
    });
    grupoId[nombre] = res.rows[0].id;
  }
  console.log(`Grupos: ${GRUPOS.length}`);

  const ejercicioInfo = {}; // nombre -> { id, grupo, sinPeso }
  for (const [nombre, grupo, sinPeso] of EJERCICIOS) {
    const res = await db.execute({
      sql: "INSERT INTO exercises (name, muscle_group_id, bodyweight) VALUES (?, ?, ?) RETURNING id",
      args: [nombre, grupoId[grupo], sinPeso ? 1 : 0],
    });
    ejercicioInfo[nombre] = { id: res.rows[0].id, grupo, sinPeso };
  }
  console.log(`Ejercicios: ${EJERCICIOS.length}`);

  let totalSets = 0;
  for (const { fecha, series } of SESIONES) {
    const startedAt = syntheticTimestamp(fecha, 0);
    const endedAt = syntheticTimestamp(fecha, series.length - 1);
    const sessionRes = await db.execute({
      sql: "INSERT INTO sessions (started_at, ended_at) VALUES (?, ?) RETURNING id",
      args: [startedAt, endedAt],
    });
    const sessionId = sessionRes.rows[0].id;

    for (let i = 0; i < series.length; i++) {
      const [ejercicio, reps, peso, notas] = series[i];
      const info = ejercicioInfo[ejercicio];
      if (!info) throw new Error(`Ejercicio no encontrado en catálogo: ${ejercicio}`);
      await db.execute({
        sql: `INSERT INTO sets
          (session_id, exercise_id, exercise_name, muscle_group_name, reps, weight, notes, logged_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          sessionId,
          info.id,
          ejercicio,
          info.grupo,
          reps,
          peso === "-" ? null : peso,
          notas || null,
          syntheticTimestamp(fecha, i),
        ],
      });
      totalSets++;
    }
    console.log(`Sesión ${fecha}: ${series.length} series`);
  }
  console.log(`Total series migradas: ${totalSets}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
