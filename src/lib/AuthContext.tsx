"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { getToken, setToken, clearToken } from "./auth";
import { call, UnauthorizedError } from "./api";

type AuthContextValue = {
  authed: boolean;
  checking: boolean;
  login: (pin: string) => Promise<boolean>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // One-time hydration from localStorage; unavailable during SSR, so it
    // can only happen after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAuthed(!!getToken());
    setChecking(false);
  }, []);

  async function login(pin: string) {
    setToken(pin.trim());
    try {
      await call("verify", {});
      setAuthed(true);
      return true;
    } catch (err) {
      clearToken();
      setAuthed(false);
      if (err instanceof UnauthorizedError) return false;
      throw err;
    }
  }

  function logout() {
    clearToken();
    setAuthed(false);
  }

  return (
    <AuthContext.Provider value={{ authed, checking, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
