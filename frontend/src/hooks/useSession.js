// frontend/src/hooks/useSession.js
import { useEffect, useState } from "react";
import api from "../lib/axios";

export default function useSession() {
  const [state, setState] = useState({ loading: true, user: null, error: null });

  useEffect(() => {
    let cancelled = false;
    (async () => {
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
    })();
    return () => { cancelled = true; };
  }, []);

  return state;
}