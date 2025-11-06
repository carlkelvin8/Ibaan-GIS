import express from "express";
import proxy from "express-http-proxy";

const router = express.Router();

// If you prefer to hit GeoServer directly from the frontend, skip the proxy.
// Otherwise keep it and point the frontend to /gs.
const GS = process.env.GEOSERVER_URL || "http://geoserver-custom-production.up.railway.app/geoserver";

// Pass through WMS/WFS paths
router.use("/wms", proxy(GS, { proxyReqPathResolver: req => `/wms${req.url}` }));
router.use("/wfs", proxy(GS, { proxyReqPathResolver: req => `/wfs${req.url}` }));

export default router;
