import React, { useEffect, useState, useRef, useMemo } from "react";
import { MapContainer, TileLayer, GeoJSON, LayersControl, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const MAX_ZOOM = 19;

// ---- CONFIG: adjust paths if different ----
const DATA_SPECS = [
    { key: "municipality", path: "/geoData/muni/Ibaan_muni.geojson", color: "#555", weight: 2, fillColor: "#bbbbbb", fillOpacity: 0.35 },
    { key: "river",        path: "/geoData/river/Ibaan_river_WGS84.geojson", color: "#0077ff", weight: 3, fillOpacity: 0 },
    { key: "road",         path: "/geoData/road/ibaan_road_wgs84.geojson", color: "#ff4444", weight: 3, fillOpacity: 0 },
    { key: "bf",           path: "/geoData/BF/Ibaan_BF_WGS84.geojson", color: "#00bb00", weight: 3, fillColor: "#00ff00", fillOpacity: 0.2 },
];

// ---- Helper: accept FeatureCollection or Feature ----
function isReady(g) {
    if (!g || typeof g !== "object") return false;
    if (g.type === "FeatureCollection") return Array.isArray(g.features) && g.features.length > 0;
    return g.type === "Feature" && !!g.geometry;
}

function toFeatureArray(g) {
    if (!g) return [];
    if (g.type === "FeatureCollection") return g.features || [];
    if (g.type === "Feature") return [g];
    return [];
}

// ---- Hover + popup binder ----
function makeOnEach(layerLabel) {
    return (feature, layer) => {
        const props = feature.properties || {};
        const original = { ...layer.options };
        layer.on({
            mouseover: () => {
                try { layer.setStyle({ ...original, color: "#F2C200", weight: (original.weight || 2) + 1 }); } catch {}
            },
            mouseout: () => {
                try { layer.setStyle(original); } catch {}
            },
        });
        layer.bindPopup(
            `<div style="font-size:13px;line-height:1.4;">
         <strong>${layerLabel.toUpperCase()}</strong><br/>
         ${Object.entries(props).slice(0, 12).map(([k,v]) => `<div><b>${k}:</b> ${v}</div>`).join("")}
       </div>`,
            { maxWidth: 320 }
        );
    };
}

// ---- Component that fits bounds once after all layers loaded ----
function FitBoundsOnData({ datasets }) {
    const map = useMap();
    const doneRef = useRef(false);
    useEffect(() => {
        if (doneRef.current) return;
        if (!map) return;
        // Only proceed when at least one dataset has data
        const any = datasets.some(d => isReady(d.data));
        if (!any) return;
        const group = L.featureGroup();
        datasets.forEach(d => {
            if (isReady(d.data)) {
                group.addLayer(L.geoJSON(d.data));
            }
        });
        const b = group.getBounds();
        if (b.isValid()) {
            map.fitBounds(b, { padding: [30, 30], maxZoom: 15 });
            doneRef.current = true;
        }
    }, [datasets, map]);
    return null;
}

export default function MapPage() {
    const [dataMap, setDataMap] = useState(() => Object.fromEntries(DATA_SPECS.map(s => [s.key, { loading: true, error: null, data: null }])));
    const allDone = useMemo(
        () => DATA_SPECS.every(s => !dataMap[s.key].loading),
        [dataMap]
    );

    // Load all in parallel
    useEffect(() => {
        let cancelled = false;
        (async () => {
            await Promise.all(
                DATA_SPECS.map(async spec => {
                    try {
                        const res = await fetch(spec.path);
                        if (!res.ok) throw new Error(`${spec.key} HTTP ${res.status}`);
                        const json = await res.json();
                        if (cancelled) return;
                        setDataMap(prev => ({
                            ...prev,
                            [spec.key]: { loading: false, error: null, data: json },
                        }));
                    } catch (e) {
                        if (cancelled) return;
                        console.error("Failed:", spec.key, e);
                        setDataMap(prev => ({
                            ...prev,
                            [spec.key]: { loading: false, error: e.message, data: null },
                        }));
                    }
                })
            );
        })();
        return () => { cancelled = true; };
    }, []);

    const datasets = DATA_SPECS.map(s => ({
        key: s.key,
        data: dataMap[s.key].data,
        style: () => ({
            color: s.color,
            weight: s.weight,
            fillColor: s.fillColor,
            fillOpacity: s.fillOpacity ?? 0,
        }),
        label: s.key,
    }));

    return (
        <div style={{ height: "100vh", width: "100%", position: "relative" }}>
            {!allDone && (
                <div style={{
                    position: "absolute", top: 10, left: 10, zIndex: 1000,
                    background: "#fff", padding: "6px 10px", borderRadius: 8,
                    boxShadow: "0 2px 8px rgba(0,0,0,.15)", fontSize: 13
                }}>
                    Loading GeoJSON…
                </div>
            )}

            {datasets.some(d => dataMap[d.key].error) && (
                <div style={{
                    position: "absolute", top: 10, right: 10, zIndex: 1000,
                    background: "#fff", padding: "6px 10px", borderRadius: 8,
                    boxShadow: "0 2px 8px rgba(0,0,0,.15)", fontSize: 13, color: "#b00020"
                }}>
                    {DATA_SPECS.filter(s => dataMap[s.key].error)
                        .map(s => `${s.key}: ${dataMap[s.key].error}`).join(" | ")}
                </div>
            )}

            <MapContainer
                center={[13.8, 121.14]}
                zoom={12}
                maxZoom={MAX_ZOOM}
                style={{ height: "100%", width: "100%" }}
            >
                <LayersControl position="topright">
                    <LayersControl.BaseLayer checked name="OpenStreetMap">
                        <TileLayer
                            attribution="© OpenStreetMap contributors"
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            maxZoom={MAX_ZOOM}
                        />
                    </LayersControl.BaseLayer>

                    <LayersControl.BaseLayer name="Esri World Imagery">
                        <TileLayer
                            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                            attribution="Tiles © Esri"
                            maxZoom={MAX_ZOOM}
                        />
                    </LayersControl.BaseLayer>
                </LayersControl>

                {datasets.map(d => (
                    isReady(d.data) && (
                        <GeoJSON
                            key={d.key}
                            data={d.data}
                            style={d.style}
                            onEachFeature={makeOnEach(d.label)}
                        />
                    )
                ))}

                <FitBoundsOnData datasets={datasets} />
            </MapContainer>
        </div>
    );
}
