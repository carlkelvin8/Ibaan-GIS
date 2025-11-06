// frontend/src/context/AuthContext.jsx
import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";

/** ---------- small utils ---------- */
function base64UrlDecode(str = "") {
  try {
    const pad = "===".slice(0, (4 - (str.length % 4)) % 4);
    const b64 = (str + pad).replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(b64);
    return json;
  } catch {
    return "{}";
  }
}

function decodeJwt(token) {
  try {
    const [, payload] = String(token).split(".");
    if (!payload) return null;
    const json = base64UrlDecode(payload);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function nowSec() {
  return Math.floor(Date.now() / 1000);
}

function readToken() {
  return localStorage.getItem("token") || sessionStorage.getItem("token") || null;
}

function writeToken(token, { persist = true } = {}) {
  // persist=true → localStorage, else sessionStorage
  if (persist) {
    localStorage.setItem("token", token);
    sessionStorage.removeItem("token");
  } else {
    sessionStorage.setItem("token", token);
    localStorage.removeItem("token");
  }
}

function clearToken() {
  localStorage.removeItem("token");
  sessionStorage.removeItem("token");
}

/** ---------- context types ---------- */
const AuthContext = createContext(null);

export function AuthProvider({ children, persistByDefault = true }) {
  const [token, setTokenState] = useState(() => readToken());
  const [payload, setPayload] = useState(() => (token ? decodeJwt(token) : null));

  // derive fields
  const role = payload?.role ?? null;
  const userId = payload?.id ?? null;
  const username = payload?.username ?? null;
  const exp = payload?.exp ?? null;

  const isExpired = useMemo(() => {
    if (!exp) return false;
    return nowSec() >= Number(exp);
  }, [exp]);

  const isAuthenticated = Boolean(token) && !isExpired;
  const isAdmin = role === "admin" || role === "superadmin" || String(role) === "1";

  /** setToken: i-save + i-decode + i-update state */
  const setToken = useCallback(
    (newToken, options = { persist: persistByDefault }) => {
      if (!newToken) {
        clearToken();
        setTokenState(null);
        setPayload(null);
        return;
      }
      writeToken(newToken, options);
      setTokenState(newToken);
      setPayload(decodeJwt(newToken));
    },
    [persistByDefault]
  );

  /** login: wrapper ng setToken (puwede kang magdagdag ng fetch user profile dito kung gusto mo) */
  const login = useCallback(
    (newToken, options) => {
      setToken(newToken, options);
    },
    [setToken]
  );

  /** logout: clear lahat */
  const logout = useCallback(() => {
    clearToken();
    setTokenState(null);
    setPayload(null);
    // optional redirect:
    // window.location.assign('/login');
  }, []);

  /** on mount: resync from storage (in case preloaded) */
  useEffect(() => {
    const t = readToken();
    if (t && t !== token) {
      setTokenState(t);
      setPayload(decodeJwt(t));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** listen sa storage events (cross-tabs logout/login) */
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== "token") return;
      const t = readToken();
      setTokenState(t);
      setPayload(t ? decodeJwt(t) : null);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  /** auto-logout kapag expired na ang token */
  useEffect(() => {
    if (!exp) return;
    const msLeft = Math.max(0, Number(exp) * 1000 - Date.now());
    const id = setTimeout(() => {
      // token expired → logout
      logout();
    }, msLeft + 500); // small buffer
    return () => clearTimeout(id);
  }, [exp, logout]);

  const value = useMemo(
    () => ({
      token,
      payload,
      role,
      userId,
      username,
      exp,
      isAuthenticated,
      isAdmin,
      setToken,
      login,
      logout,
      getToken: readToken,
    }),
    [token, payload, role, userId, username, exp, isAuthenticated, isAdmin, setToken, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Hook para gamitin sa components */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

/** Optional: guard components */

export function RequireAuth({ children, fallback = null }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return fallback;
  return children;
}

export function RequireAdmin({ children, fallback = null }) {
  const { isAuthenticated, isAdmin } = useAuth();
  if (!isAuthenticated || !isAdmin) return fallback;
  return children;
}

export default AuthContext;
