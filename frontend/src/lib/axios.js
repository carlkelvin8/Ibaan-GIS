// frontend/src/lib/axios.js
import axios from "axios";

// Prefer VITE_API_URL, fallback sa VITE_API_BASE_URL, then localhost
const BASE_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:5000/api";

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  timeout: 15000,
});

// ---- Helpers (optional pero useful) ----
export function setAuthToken(token) {
  if (token) localStorage.setItem("token", token);
}

export function clearAuthToken() {
  localStorage.removeItem("token");
}

// ---- Request interceptor: attach Bearer token ----
api.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token");
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (err) => {
    console.error("API Request Error:", err);
    return Promise.reject(err);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API Response Error:", error);
    if (error.response && error.response.status === 401) {
      localStorage.removeItem("token");
      sessionStorage.removeItem("token");
      // Optional: window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
