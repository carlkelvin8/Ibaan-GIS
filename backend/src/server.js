// server.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";
import { database } from "./config/database.js";

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
import auditLogsRoutes from "./routes/auditLogsRoute.js";

dotenv.config();

const app = express();

/* =========================
   Basic config
   ========================= */
const PORT = Number(process.env.PORT) || 5000;

const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://cvgeospatial.gghsoftwaredev.com",
  "https://www.cvgeospatial.gghsoftwaredev.com",
  process.env.CLIENT_URL,
].filter(Boolean);

app.set("trust proxy", 1);

/* =========================
   Middlewares
   ========================= */
app.use(
  cors({
    credentials: true,
    origin: (origin, cb) => {
      // allow server-to-server tools (no Origin) and allowed web origins
      if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      return cb(new Error("Not allowed by CORS"));
    },
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(morgan("dev"));

/* =========================
   Health check
   ========================= */
app.get("/api/health", (_req, res) =>
  res.json({ ok: true, ts: new Date().toISOString() })
);

/* =========================
   DB ping (non-fatal)
   ========================= */
(async () => {
  try {
    const [rows] = await database.query("SELECT 1 + 1 AS result");
    console.log("✅ DB OK. Test =", rows?.[0]?.result);
  } catch (err) {
    console.warn("⚠️  DB ping failed (server will still start):", err?.message || err);
  }
})();

/* =========================
   (GeoServer removed)
   =========================
   Note: This build no longer proxies /gs to GeoServer.
   If you later want to re-add a proxy, bring back http-proxy-middleware
   and mount it at /gs.
*/

/* =========================
   Route mounts
   NOTE: Frontend calls /api/...; keep /api/user for backward compatibility.
   ========================= */
app.use("/api", userRoutes);        // /api/login, /api/signup, /api/admin/users
app.use("/api/user", userRoutes);   // legacy: /api/user/login, etc.

app.use("/api/alameda", alamedaRoutes);

// Normalize ?sort=-updated_at:1 style to ?sort=-updated_at
app.use("/api/ibaan/parcels", (req, _res, next) => {
  const s = req.query?.sort;
  if (typeof s === "string" && s.includes(":")) req.query.sort = s.split(":")[0];
  next();
});
app.use("/api/ibaan", ibaanRoutes);

app.use("/api/landparcel", landParcelRoutes);
app.use("/api/building", buildingRoutes);

// Original tax mount
app.use("/api/tax", taxRoutes);

// Back-compat alias so /api/ibaan/taxes/* works (e.g., /upcoming)
app.use("/api/ibaan/taxes", taxRoutes);

app.use("/api/landappraisal", landAppraisalRoutes);
app.use("/api/landassessment", landAssessmentRoutes);
app.use("/api/taxotherdetails", taxOtherDetailsRoutes);
app.use("/api/audit-logs", auditLogsRoutes);

// Back-compat alias so /api/logs?scope=... works
app.use("/api/logs", auditLogsRoutes);

/* =========================
   404 + Error handler
   ========================= */
app.use((req, res) => {
  res.status(404).json({ error: "Not found", path: req.originalUrl });
});

app.use((err, _req, res, _next) => {
  console.error("🔥 Unhandled error:", err);
  res.status(err?.status || 500).json({ error: err?.message || "Server error" });
});

/* =========================
   Start server
   ========================= */
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 API listening on port ${PORT}`);
  try {
    console.log(
      `🌐 Allowed CORS origins: ${ALLOWED_ORIGINS
        .map((o) => {
          try {
            return new URL(o).host;
          } catch {
            return o;
          }
        })
        .join(", ")}`
    );
  } catch {
    console.log(`🌐 Allowed CORS origins (raw): ${ALLOWED_ORIGINS.join(", ")}`);
  }
});