"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const MapInner = dynamic(() => import("./map-inner"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-canvas animate-pulse flex items-center justify-center text-muted text-sm">
      Loading map…
    </div>
  ),
});

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  label: string;
  type: "restaurant" | "customer" | "driver";
}

interface OrderMapProps {
  markers: MapMarker[];
  className?: string;
}

export function OrderMap({ markers, className = "h-64" }: OrderMapProps) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  if (!ready) {
    return (
      <div
        className={`${className} bg-canvas animate-pulse rounded-2xl overflow-hidden`}
      />
    );
  }

  return (
    <div className={`${className} rounded-2xl overflow-hidden border border-border`}>
      <MapInner markers={markers} />
    </div>
  );
}
