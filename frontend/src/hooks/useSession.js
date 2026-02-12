// frontend/src/hooks/useSession.js
import { useEffect, useState } from "react";
import api from "../lib/axios";

export default function useSession() {
  const [state, setState] = useState({ loading: true, user: null, error: null });

  const fetchSession = async (cancelled = false) => {
    try {
      const res = await api.get(`/user/me?t=${Date.now()}`); // bust any caches
      if (!cancelled) setState({ loading: false, user: res.data?.data ?? null, error: null });
    } catch (e) {
      if (e?.response?.status === 401) {
        localStorage.removeItem("token");
        sessionStorage.removeItem("token");
      }
      if (!cancelled) setState({ loading: false, user: null, error: e });
    }
  };

  useEffect(() => {
    let cancelled = false;
    fetchSession(cancelled);

    const handleUserUpdate = () => {
      fetchSession(cancelled);
    };

    window.addEventListener("user-updated", handleUserUpdate);

    return () => { 
      cancelled = true; 
      window.removeEventListener("user-updated", handleUserUpdate);
    };
  }, []);

  return state;
}