"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";

const LocationPickerInner = dynamic(() => import("./location-picker-inner"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-subtle animate-pulse flex items-center justify-center text-muted text-sm">
      Cargando mapa…
    </div>
  ),
});

/** Default center: Santa Cruz de la Sierra, Bolivia */
export const DEFAULT_MAP_CENTER = { lat: -17.7833, lng: -63.1821 };

export type PickedLocation = {
  lat: number;
  lng: number;
  address: string;
};

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) throw new Error("geocode failed");
    const data = await res.json();
    return (
      data.display_name ||
      `${lat.toFixed(5)}, ${lng.toFixed(5)}`
    );
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

interface LocationPickerProps {
  value: PickedLocation | null;
  onChange: (loc: PickedLocation) => void;
  className?: string;
}

export function LocationPicker({
  value,
  onChange,
  className = "h-56",
}: LocationPickerProps) {
  const [ready, setReady] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lat = value?.lat ?? DEFAULT_MAP_CENTER.lat;
  const lng = value?.lng ?? DEFAULT_MAP_CENTER.lng;
  const hasPin = value != null;

  useEffect(() => setReady(true), []);

  const handlePick = (nextLat: number, nextLng: number) => {
    // Optimistic update with coords; address fills after geocode
    onChange({
      lat: nextLat,
      lng: nextLng,
      address: value?.address || "Ubicación seleccionada…",
    });

    if (debounceRef.current) clearTimeout(debounceRef.current);
    setGeocoding(true);
    debounceRef.current = setTimeout(async () => {
      const address = await reverseGeocode(nextLat, nextLng);
      onChange({ lat: nextLat, lng: nextLng, address });
      setGeocoding(false);
    }, 400);
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => handlePick(pos.coords.latitude, pos.coords.longitude),
      () => {
        /* ignore — user can tap map */
      },
      { enableHighAccuracy: true }
    );
  };

  if (!ready) {
    return (
      <div
        className={`${className} bg-subtle animate-pulse rounded-xl overflow-hidden`}
      />
    );
  }

  return (
    <div className="space-y-2">
      <div
        className={`${className} rounded-xl overflow-hidden border border-border relative`}
      >
        <LocationPickerInner
          lat={lat}
          lng={lng}
          onPick={handlePick}
          showMarker={hasPin}
        />
        {!hasPin && (
          <div className="absolute inset-x-0 bottom-3 flex justify-center pointer-events-none z-[1000]">
            <span className="bg-ink/85 text-white text-xs font-medium px-3 py-1.5 rounded-full">
              Toca el mapa para fijar tu ubicación
            </span>
          </div>
        )}
      </div>
      <div className="flex items-start gap-2 text-sm">
        <MapPin className="size-4 text-brand shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-ink leading-snug">
            {geocoding
              ? "Buscando dirección…"
              : value?.address || "Aún no has marcado una ubicación"}
          </p>
          {hasPin && (
            <p className="text-xs text-muted mt-0.5">
              {lat.toFixed(5)}, {lng.toFixed(5)}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={useMyLocation}
          className="shrink-0 text-xs font-semibold text-brand underline-offset-2 hover:underline"
        >
          Mi ubicación
        </button>
      </div>
    </div>
  );
}
