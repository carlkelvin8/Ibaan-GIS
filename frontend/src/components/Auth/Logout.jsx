// frontend/src/components/Auth/Logout.jsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/axios";

export default function Logout() {
  const navigate = useNavigate();
  useEffect(() => {
    (async () => {
      try {
        await api.post("/user/logout");
      } catch {}
+     // nuke any Bearer remnants
+     localStorage.removeItem("token");
+     sessionStorage.removeItem("token");
      navigate("/login", { replace: true });
    })();
  }, [navigate]);
  return <div style={{ padding: 24 }}>Signing you out…</div>;
}
