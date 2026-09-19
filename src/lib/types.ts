export type Ejercicio = {
  nombre: string;
  grupo: string;
  sinPeso: boolean;
};

export type Catalogo = {
  grupos: string[];
  ejercicios: Ejercicio[];
};

export type Ultimo = {
  reps: number | null;
  peso: number | null;
  notas: string;
  fecha: string;
} | null;

export type RegistroHoy = {
  row: number;
  grupo: string;
  ejercicio: string;
  reps: number | string;
  peso: number | string;
  notas: string;
};

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };
