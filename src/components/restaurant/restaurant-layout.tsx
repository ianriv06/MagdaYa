"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import {
  LayoutDashboard,
  UtensilsCrossed,
  ClipboardList,
  Settings,
  Wallet,
} from "lucide-react";
import { DEFAULT_DELIVERY_ETA, defaultOpeningHours, validateOpeningHours } from "@/lib/utils";
import type { OpeningHours, Restaurant } from "@/lib/types";
import {
  LocationPicker,
  type PickedLocation,
} from "@/components/map/location-picker";
import { OpeningHoursEditor } from "@/components/restaurant/opening-hours-editor";
import {
  PaymentQrUploader,
  uploadPaymentQr,
} from "@/components/payments/payment-qr-uploader";
import { isMissingColumnError } from "@/lib/receipt-upload";

const nav = [
  {
    href: "/restaurant",
    label: "Resumen",
    icon: <LayoutDashboard className="size-[26px]" />,
  },
  {
    href: "/restaurant/menu",
    label: "Menú",
    icon: <UtensilsCrossed className="size-[26px]" />,
  },
  {
    href: "/restaurant/orders",
    label: "Pedidos",
    icon: <ClipboardList className="size-[26px]" />,
  },
  {
    href: "/restaurant/pagos",
    label: "Pagos",
    icon: <Wallet className="size-[26px]" />,
  },
  {
    href: "/restaurant/settings",
    label: "Configuración",
    icon: <Settings className="size-[26px]" />,
  },
];

export function RestaurantLayout({
  title,
  children,
}: {
  title: string;
  children: (restaurant: Restaurant) => ReactNode;
}) {
  const { profile, loading, user } = useAuth();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    if (loading) return;
    if (!user || profile?.role !== "restaurant") {
      router.replace("/auth");
      return;
    }

    const load = async () => {
      const { data } = await supabase
        .from("restaurants")
        .select("*")
        .eq("owner_id", user.id)
        .maybeSingle();
      setRestaurant(data);
      setReady(true);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, profile, loading]);

  if (loading || !ready) {
    return (
      <div className="min-h-dvh flex items-center justify-center text-muted">
        Cargando…
      </div>
    );
  }

  if (!restaurant) {
    return (
      <DashboardShell title="Configura tu restaurante" nav={nav} roleLabel="Restaurante">
        <SetupRestaurant
          onCreated={(r) => {
            setRestaurant(r);
          }}
        />
      </DashboardShell>
    );
  }

  if (!profile?.payment_qr_url) {
    return (
      <DashboardShell title="QR de cobro" nav={nav} roleLabel="Restaurante">
        <SetupPaymentQr
          onSaved={() => {
            /* refreshProfile updates profile; layout re-renders */
          }}
        />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title={title} nav={nav} roleLabel="Restaurante">
      {children(restaurant)}
    </DashboardShell>
  );
}

function SetupPaymentQr({ onSaved }: { onSaved: () => void }) {
  const { user, refreshProfile } = useAuth();
  const supabase = createClient();
  const [qrPreview, setQrPreview] = useState("");
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!qrFile && !qrPreview) {
      setError("Sube la foto de tu QR de cobro");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const url = qrFile
        ? await uploadPaymentQr(user.id, qrFile)
        : qrPreview;
      const { error: qrErr } = await supabase
        .from("profiles")
        .update({ payment_qr_url: url })
        .eq("id", user.id);
      if (qrErr && isMissingColumnError(qrErr, "payment_qr_url")) {
        throw new Error(
          "Falta la columna payment_qr_url. Ejecuta supabase/pagos.sql en Supabase."
        );
      }
      if (qrErr) throw qrErr;
      await refreshProfile();
      onSaved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md animate-slide-up">
      <h2 className="font-display text-xl font-bold mb-2">Tu QR de cobro</h2>
      <p className="text-muted text-sm mb-6">
        Antes de continuar, sube la foto del QR con el que quieres recibir tus
        pagos.
      </p>
      <form onSubmit={submit} className="space-y-4">
        <PaymentQrUploader
          value={qrPreview}
          required
          onChange={(url, file) => {
            setQrPreview(url);
            setQrFile(file ?? null);
          }}
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 rounded-2xl bg-brand text-white font-semibold disabled:opacity-50"
        >
          {loading ? "Guardando…" : "Guardar QR"}
        </button>
      </form>
    </div>
  );
}

function SetupRestaurant({
  onCreated,
}: {
  onCreated: (r: Restaurant) => void;
}) {
  const { user, refreshProfile } = useAuth();
  const supabase = createClient();
  const [name, setName] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState<PickedLocation | null>(null);
  const [openingHours, setOpeningHours] = useState<OpeningHours>(
    defaultOpeningHours
  );
  const [qrPreview, setQrPreview] = useState("");
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!location) {
      setError("Marca la ubicación exacta de tu restaurante en el mapa");
      return;
    }
    if (!qrFile && !qrPreview) {
      setError("Sube la foto de tu QR de cobro");
      return;
    }
    const hoursError = validateOpeningHours(openingHours);
    if (hoursError) {
      setError(hoursError);
      return;
    }
    setLoading(true);
    setError("");

    try {
      let paymentQrUrl = qrPreview;
      if (qrFile) {
        paymentQrUrl = await uploadPaymentQr(user.id, qrFile);
      }

      const { error: qrErr } = await supabase
        .from("profiles")
        .update({ payment_qr_url: paymentQrUrl })
        .eq("id", user.id);

      if (qrErr && isMissingColumnError(qrErr, "payment_qr_url")) {
        throw new Error(
          "Falta la columna payment_qr_url. Ejecuta supabase/pagos.sql en Supabase."
        );
      }
      if (qrErr) throw qrErr;
      await refreshProfile();

      const payload = {
        owner_id: user.id,
        name,
        address: location.address,
        cuisine,
        description,
        delivery_eta_range: DEFAULT_DELIVERY_ETA,
        eta_minutes: 25,
        lat: location.lat,
        lng: location.lng,
        opening_hours: openingHours,
        image_url: `https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80`,
        cover_url: `https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&q=80`,
      };

      let { data, error: err } = await supabase
        .from("restaurants")
        .insert(payload)
        .select()
        .single();

      if (err && isMissingColumnError(err, "opening_hours")) {
        const { opening_hours: _h, ...withoutHours } = payload;
        const retry = await supabase
          .from("restaurants")
          .insert(withoutHours)
          .select()
          .single();
        data = retry.data;
        err = retry.error;
      }

      if (
        err &&
        typeof err.message === "string" &&
        err.message.toLowerCase().includes("delivery_eta_range")
      ) {
        const { delivery_eta_range: _r, ...withoutRange } = payload;
        const retry = await supabase
          .from("restaurants")
          .insert(withoutRange)
          .select()
          .single();
        data = retry.data;
        err = retry.error;
      }

      if (err) throw err;
      if (!data) throw new Error("No se pudo crear el restaurante");
      onCreated(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al crear");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md animate-slide-up">
      <h2 className="font-display text-xl font-bold mb-2">
        Configura tu restaurante
      </h2>
      <p className="text-muted text-sm mb-6">
        Cuéntanos sobre tu local, marca su ubicación y sube tu QR de cobro.
      </p>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Nombre del restaurante</label>
          <input
            className="w-full h-12 px-4 rounded-2xl border-2 border-border bg-surface focus:outline-none focus:border-brand"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Tipo de comida</label>
          <input
            className="w-full h-12 px-4 rounded-2xl border-2 border-border bg-surface focus:outline-none focus:border-brand"
            value={cuisine}
            onChange={(e) => setCuisine(e.target.value)}
            placeholder="Italiana, mexicana, hamburguesas…"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            Ubicación en el mapa <span className="text-danger">*</span>
          </label>
          <p className="text-xs text-muted mb-2">
            Toca o arrastra el pin hasta la dirección exacta de tu local. Los
            clientes verán esta ubicación en sus pedidos.
          </p>
          <LocationPicker value={location} onChange={setLocation} />
        </div>
        <OpeningHoursEditor value={openingHours} onChange={setOpeningHours} />
        <PaymentQrUploader
          value={qrPreview}
          required
          onChange={(url, file) => {
            setQrPreview(url);
            setQrFile(file ?? null);
          }}
        />
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Descripción</label>
          <textarea
            className="w-full min-h-24 px-4 py-3 rounded-2xl border-2 border-border bg-surface focus:outline-none focus:border-brand resize-none"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 rounded-2xl bg-brand text-white font-semibold disabled:opacity-50"
        >
          {loading ? "Creando…" : "Crear restaurante"}
        </button>
      </form>
    </div>
  );
}
