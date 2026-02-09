import express from "express";
import proxy from "express-http-proxy";

const router = express.Router();

const GS = process.env.GEOSERVER_URL || "http://geoserver-custom-production.up.railway.app/geoserver";

/**
 * @swagger
 * tags:
 *   name: GeoServer
 *   description: Proxy routes for GeoServer WMS/WFS
 */

/**
 * @swagger
 * /gs/wms:
 *   get:
 *     summary: Proxy to GeoServer WMS
 *     tags: [GeoServer]
 *     parameters:
 *       - in: query
 *         name: service
 *         schema:
 *           type: string
 *           default: WMS
 *       - in: query
 *         name: request
 *         schema:
 *           type: string
 *           default: GetCapabilities
 *     responses:
 *       200:
 *         description: WMS Response
 */
router.use("/wms", proxy(GS, { proxyReqPathResolver: req => `/geoserver/wms${req.url}` }));

/**
 * @swagger
 * /gs/wfs:
 *   get:
 *     summary: Proxy to GeoServer WFS
 *     tags: [GeoServer]
 *     parameters:
 *       - in: query
 *         name: service
 *         schema:
 *           type: string
 *           default: WFS
 *       - in: query
 *         name: request
 *         schema:
 *           type: string
 *           default: GetCapabilities
 *     responses:
 *       200:
 *         description: WFS Response
 */
router.use("/wfs", proxy(GS, { proxyReqPathResolver: req => `/geoserver/wfs${req.url}` }));

export default router;
