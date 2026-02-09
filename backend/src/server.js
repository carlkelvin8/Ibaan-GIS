import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { createProxyMiddleware } from "http-proxy-middleware";
import { database } from "./config/database.js";
import swaggerUi from "swagger-ui-express";
import swaggerSpecs from "./config/swagger.js";

// ----- Routes -----
import alamedaRoutes from "./routes/alamedaRoute.js";
import ibaanRoutes from "./routes/ibaanRoute.js";
import landParcelRoutes from "./routes/landParcelRoute.js";
import userRoutes from "./routes/userRoute.js";
import buildingRoutes from "./routes/buildingRoutes.js";
import taxRoutes from "./routes/taxRoute.js";
import landAppraisalRoutes from "./routes/landAppraisalRoute.js";
import landAssessmentRoutes from "./routes/landAssessmentRoutes.js";
import taxOtherDetailsRoutes from "./routes/taxOtherDetailsRoutes.js";
import auditLogsRoute from './routes/auditLogsRoute.js';

dotenv.config();

const app = express();

/* =========================
   Basic config
   ========================= */
const PORT = Number(process.env.PORT) || 5000;

const GEOSERVER_URL =
  process.env.GEOSERVER_URL ||
  "https://geoserver-custom-production.up.railway.app/geoserver";

const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:5174",
   "https://cvgeospatial.gghsoftwaredev.com/",
  process.env.CLIENT_URL,
].filter(Boolean);

app.set("trust proxy", 1);

/* =========================
   Middlewares (order matters)
   ========================= */
app.use(cors({
  credentials: true,
  
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    return cb(new Error("Not allowed by CORS"));
  },
  methods: ['GET','POST','PUT', 'PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));
app.use(cookieParser());                 // <-- so req.cookies.session works
app.use(express.json({ limit: "10mb" }));
app.use(morgan("dev"));

/* =========================
   Health / DB ping
   ========================= */
app.get("/api/health", (_req, res) =>
  res.json({ ok: true, ts: new Date().toISOString() })
);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

(async () => {
  try {
    const [rows] = await database.query("SELECT 1 + 1 AS result");
    console.log("✅ DB OK. Test =", rows?.[0]?.result);
  } catch (err) {
    console.warn("⚠️  DB ping failed (server will still start):", err?.message);
  }
})();

/* =========================
   GeoServer proxy (/gs → GEOSERVER_URL)
   ========================= */
app.use(
  "/gs",
  createProxyMiddleware({
    target: GEOSERVER_URL,
    changeOrigin: true,
    pathRewrite: { "^/gs": "" },
    logLevel: "warn",
    onProxyReq(proxyReq, req, _res) {
      console.log("→ GS", proxyReq.method, proxyReq.path);
    },
    onError(err, _req, res) {
      console.error("GeoServer proxy error:", err?.message);
      res.status(502).json({ error: "GeoServer proxy failed" });
    },
  })
);

/* =========================
   API routes
   ========================= */
// userRoutes exposes: POST /login, POST /signup, GET /me, POST /logout,
// admin users: GET /admin/users and CRUD under /user/*
app.use("/api", userRoutes);       // /api/login, /api/me, /api/admin/users
app.use("/api/user", userRoutes);  // legacy: /api/user/login, /api/user/me

app.use("/api/alameda", alamedaRoutes);

// Normalize ?sort=-updated_at:1 → ?sort=-updated_at (back-compat)
app.use("/api/ibaan/parcels", (req, _res, next) => {
  const s = req.query?.sort;
  if (typeof s === "string" && s.includes(":")) req.query.sort = s.split(":")[0];
  next();
});
app.use('/api', auditLogsRoute);
app.use("/api/ibaan", ibaanRoutes);

app.use("/api/landparcel", landParcelRoutes);
app.disable('etag'); // global: avoid 304s
app.use('/api/building', buildingRoutes);
app.use("/api/tax", taxRoutes);
app.use("/api/ibaan/taxes", taxRoutes); // alias

app.use("/api/landappraisal", landAppraisalRoutes);
app.use("/api/landassessment", landAssessmentRoutes);
app.use("/api/taxotherdetails", taxOtherDetailsRoutes);

/* =========================
   404 + Error handler
   ========================= */
app.use((req, res) => {
  res.status(404).json({ error: "Not found", path: req.originalUrl });
});

app.use((err, _req, res, _next) => {
  console.error("🔥 Unhandled error:", err);
  res.status(err.status || 500).json({ error: err?.message || "Server error" });
});

/* =========================
   Start
   ========================= */
app.listen(PORT, () => {
  console.log(`🚀 API server running on port ${PORT}`);
  console.log(`🌐 Expected host: ${process.env.HOST || "http://localhost"}:${PORT}`);
  console.log(`🔐 CORS allowed: ${ALLOWED_ORIGINS.map((o) => new URL(o).host).join(", ")}`);
  console.log(`🛰️ GeoServer proxy target: ${GEOSERVER_URL}`);
});
