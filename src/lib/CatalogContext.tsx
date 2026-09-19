"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { call, UnauthorizedError } from "./api";
import type { Catalogo, Ejercicio } from "./types";
import { useAuth } from "./AuthContext";

type CatalogContextValue = {
  catalogo: Catalogo;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addEjercicio: (e: Ejercicio) => Promise<void>;
  updateEjercicio: (nombreOriginal: string, e: Ejercicio) => Promise<void>;
  deleteEjercicio: (nombre: string) => Promise<void>;
  addGrupo: (nombre: string) => Promise<void>;
  updateGrupo: (nombreOriginal: string, nombre: string) => Promise<void>;
  deleteGrupo: (nombre: string) => Promise<void>;
};

const CatalogContext = createContext<CatalogContextValue | null>(null);

const EMPTY: Catalogo = { grupos: [], ejercicios: [] };

export function CatalogProvider({ children }: { children: ReactNode }) {
  const { authed, logout } = useAuth();
  const [catalogo, setCatalogo] = useState<Catalogo>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await call<Catalogo>("getCatalogo");
      setCatalogo(data);
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        logout();
      } else {
        setError(err instanceof Error ? err.message : "Error al cargar el catálogo");
      }
    } finally {
      setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    // Fetch-on-mount/auth-change; refresh sets loading state synchronously
    // before its internal await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (authed) refresh();
  }, [authed, refresh]);

  async function addEjercicio(e: Ejercicio) {
    await call("addEjercicio", e);
    await refresh();
  }

  async function updateEjercicio(nombreOriginal: string, e: Ejercicio) {
    await call("updateEjercicio", { nombreOriginal, ...e });
    await refresh();
  }

  async function deleteEjercicio(nombre: string) {
    await call("deleteEjercicio", { nombre });
    await refresh();
  }

  async function addGrupo(nombre: string) {
    await call("addGrupo", { nombre });
    await refresh();
  }

  async function updateGrupo(nombreOriginal: string, nombre: string) {
    await call("updateGrupo", { nombreOriginal, nombre });
    await refresh();
  }

  async function deleteGrupo(nombre: string) {
    await call("deleteGrupo", { nombre });
    await refresh();
  }

  return (
    <CatalogContext.Provider
      value={{
        catalogo,
        loading,
        error,
        refresh,
        addEjercicio,
        updateEjercicio,
        deleteEjercicio,
        addGrupo,
        updateGrupo,
        deleteGrupo,
      }}
    >
      {children}
    </CatalogContext.Provider>
  );
}

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error("useCatalog debe usarse dentro de CatalogProvider");
  return ctx;
}
