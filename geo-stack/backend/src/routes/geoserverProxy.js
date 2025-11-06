// backend/src/routes/geoserverProxy.js
import express from "express";
import proxy from "express-http-proxy";
import rateLimit from "express-rate-limit";

const router = express.Router();

// Normalize base URL (strip trailing slash)
const GS =
  (process.env.GEOSERVER_URL || "http://geoserver-custom-production.up.railway.app/geoserver")
    .replace(/\/+$/, "");

const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";
const ALLOWED_METHODS = new Set(["GET", "POST", "HEAD", "OPTIONS"]);

// ---- helpers ----
function buildBasicAuthHeader() {
  const u = process.env.GEOSERVER_USER;
  const p = process.env.GEOSERVER_PASS;
  if (!u || !p) return null;
  return "Basic " + Buffer.from(`${u}:${p}`).toString("base64");
}

function enforceService(expected) {
  return (req, res, next) => {
    // req.url starts with "?..." inside the mounted route
    const qs = req.url.startsWith("?") ? req.url.slice(1) : req.url;
    const params = new URLSearchParams(qs);
    const raw = (params.get("service") || params.get("SERVICE") || "").toUpperCase();
    // If SERVICE is provided, it must match the route's expected type.
    if (raw && raw !== expected) {
      return res.status(400).json({ error: `SERVICE must be ${expected}` });
    }
    next();
  };
}

// Optional: restrict methods early
router.use((req, res, next) => {
  if (!ALLOWED_METHODS.has(req.method)) return res.status(405).end();
  next();
});

// Basic per-minute limiter for /gs (tweak as needed)
const limiter = rateLimit({
  windowMs: 60_000,
  max: 120, // 120 req/min per IP
  standardHeaders: true,
  legacyHeaders: false,
});
router.use(limiter);

// Common proxy options
const commonProxyOpts = {
  parseReqBody: false, // keep raw streaming for XML/binary
  timeout: 15_000,     // 15s upstream timeout
  proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
    const out = { ...proxyReqOpts, headers: { ...proxyReqOpts.headers } };

    // Prefer GeoServer Basic auth if provided; else pass through client Authorization
    const basic = buildBasicAuthHeader();
    if (basic) {
      out.headers["authorization"] = basic;
    } else if (srcReq.headers["authorization"]) {
      out.headers["authorization"] = srcReq.headers["authorization"];
    }

    // Preserve content-type on POST/PUT
    if (srcReq.headers["content-type"]) {
      out.headers["content-type"] = srcReq.headers["content-type"];
    }

    // Optional: forward Accept for proper image/json selection
    if (srcReq.headers["accept"]) {
      out.headers["accept"] = srcReq.headers["accept"];
    }

    return out;
  },
  userResHeaderDecorator: (headers) => {
    // CORS (you can also set this globally on the app)
    headers["Access-Control-Allow-Origin"] = CORS_ORIGIN;
    headers["Access-Control-Expose-Headers"] = "Content-Type, Content-Length, ETag, Date";
    headers["X-Content-Type-Options"] = "nosniff";
    delete headers["transfer-encoding"]; // avoid duplicated hop-by-hop header
    return headers;
  },
  proxyErrorHandler: (err, res) => {
    const code = err?.code || "";
    const isTimeout = code === "ETIMEDOUT" || code === "ECONNRESET";
    res
      .status(isTimeout ? 504 : 502)
      .json({ error: "Upstream GeoServer error", code });
  },
};

// /gs/wms → {GS}/wms
router.use(
  "/wms",
  enforceService("WMS"),
  proxy(GS, {
    ...commonProxyOpts,
    proxyReqPathResolver: (req) => {
      const q = req.url || ""; // Express leaves only query here
      return `/wms${q}`;
    },
  })
);

// /gs/wfs → {GS}/wfs
router.use(
  "/wfs",
  enforceService("WFS"),
  proxy(GS, {
    ...commonProxyOpts,
    timeout: 20_000, // WFS can be heavier, give a bit more time
    proxyReqPathResolver: (req) => {
      const q = req.url || "";
      return `/wfs${q}`;
    },
  })
);

export default router;
