CREATE TABLE muscle_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE COLLATE NOCASE
);

CREATE TABLE exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE COLLATE NOCASE,
  muscle_group_id INTEGER NOT NULL REFERENCES muscle_groups(id),
  bodyweight INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_exercises_muscle_group ON exercises(muscle_group_id);

CREATE TABLE sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at TEXT NOT NULL,
  ended_at TEXT NOT NULL
);

CREATE INDEX idx_sessions_ended_at ON sessions(ended_at);

CREATE TABLE sets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER REFERENCES sessions(id) ON DELETE SET NULL,
  exercise_id INTEGER REFERENCES exercises(id) ON DELETE SET NULL,
  exercise_name TEXT NOT NULL,
  muscle_group_name TEXT NOT NULL,
  reps INTEGER NOT NULL,
  weight REAL,
  notes TEXT,
  logged_at TEXT NOT NULL
);

CREATE INDEX idx_sets_session ON sets(session_id);
CREATE INDEX idx_sets_exercise_name ON sets(exercise_name);
CREATE INDEX idx_sets_logged_at ON sets(logged_at);

-- Rutina: un ayuda-memoria de edición manual, sin relación con
-- exercises/sets. Slots de sesión ordenados (no atados a un día de la
-- semana — "Sesión 1", "Sesión 2"... es la posición en `orden`, no un
-- nombre guardado). sesion/ejercicios/descansos son texto libre (preservan
-- los saltos de línea tal como se cargan) a propósito — es un espejo
-- simple de una tabla de Notion, no un modelo relacional de rutinas.
CREATE TABLE routine (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  orden INTEGER NOT NULL,
  sesion TEXT NOT NULL DEFAULT '',
  ejercicios TEXT NOT NULL DEFAULT '',
  descansos TEXT NOT NULL DEFAULT ''
);

CREATE INDEX idx_routine_orden ON routine(orden);
