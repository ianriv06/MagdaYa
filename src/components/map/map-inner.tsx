"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { useEffect } from "react";
import type { MapMarker } from "./order-map";
import "leaflet/dist/leaflet.css";

const COLORS = {
  restaurant: "#ef4444",
  customer: "#3b82f6",
  driver: "#06c167",
};

function createIcon(type: MapMarker["type"]) {
  const color = COLORS[type];
  return L.divIcon({
    className: "",
    html: `<div style="
      width:28px;height:28px;border-radius:50%;
      background:${color};border:3px solid white;
      box-shadow:0 2px 8px rgba(0,0,0,.25);
    "></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function FitBounds({ markers }: { markers: MapMarker[] }) {
  const map = useMap();
  useEffect(() => {
    if (markers.length === 0) return;
    if (markers.length === 1) {
      map.setView([markers[0].lat, markers[0].lng], 14);
      return;
    }
    const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng]));
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [markers, map]);
  return null;
}

export default function MapInner({ markers }: { markers: MapMarker[] }) {
  const center: [number, number] =
    markers.length > 0
      ? [markers[0].lat, markers[0].lng]
      : [40.7128, -74.006];

  return (
    <MapContainer
      center={center}
      zoom={13}
      style={{ width: "100%", height: "100%" }}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds markers={markers} />
      {markers.map((m) => (
        <Marker key={m.id} position={[m.lat, m.lng]} icon={createIcon(m.type)}>
          <Popup>
            <strong>{m.label}</strong>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
