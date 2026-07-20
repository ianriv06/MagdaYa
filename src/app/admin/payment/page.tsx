"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AdminLayout } from "@/components/admin/admin-layout";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import type { PaymentSettings } from "@/lib/types";
import { QrCode, Upload } from "lucide-react";

export default function AdminPaymentPage() {
  return (
    <AdminLayout title="QR de pago">
      <PaymentQRManager />
    </AdminLayout>
  );
}

function PaymentQRManager() {
  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const { user } = useAuth();
  const supabase = createClient();

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("payment_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      setSettings(data);
      if (data?.qr_image_url) setPreview(data.qr_image_url);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    if (!file && !settings?.qr_image_url) {
      setMessage("Selecciona una imagen del QR");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      let qr_image_url = settings?.qr_image_url || null;

      if (file) {
        const ext = file.name.split(".").pop();
        const path = `global-qr-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("payment-qr")
          .upload(path, file, { upsert: true });
        if (upErr) throw upErr;
        const {
          data: { publicUrl },
        } = supabase.storage.from("payment-qr").getPublicUrl(path);
        qr_image_url = publicUrl;
      }

      if (settings?.id) {
        const { data, error } = await supabase
          .from("payment_settings")
          .update({
            qr_image_url,
            updated_by: user?.id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", settings.id)
          .select()
          .single();
        if (error) throw error;
        setSettings(data);
      } else {
        const { data, error } = await supabase
          .from("payment_settings")
          .insert({
            qr_image_url,
            updated_by: user?.id,
          })
          .select()
          .single();
        if (error) throw error;
        setSettings(data);
      }

      setPreview(qr_image_url || "");
      setFile(null);
      setMessage("QR de pago actualizado");
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Error al subir");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md space-y-6 animate-slide-up">
      <div className="rounded-3xl bg-surface border border-border p-5 space-y-4">
        <div className="flex items-center gap-2">
          <QrCode className="size-5 text-brand" />
          <h2 className="font-semibold">QR de pago global</h2>
        </div>
        <p className="text-sm text-muted">
          Este código QR se muestra a todos los clientes al pagar. Puedes
          cambiarlo cuando quieras.
        </p>

        <label className="relative block h-56 rounded-2xl border-2 border-dashed border-border bg-canvas overflow-hidden cursor-pointer hover:border-brand transition-colors">
          {preview ? (
            <Image
              src={preview}
              alt="QR de pago"
              fill
              className="object-contain p-4"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted text-sm">
              <Upload className="size-8 mb-2 opacity-40" />
              Toca para subir imagen del QR
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            className="absolute inset-0 opacity-0 cursor-pointer"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                setFile(f);
                setPreview(URL.createObjectURL(f));
              }
            }}
          />
        </label>

        {message && (
          <p
            className={`text-sm ${
              message.includes("actualizado") ? "text-brand" : "text-danger"
            }`}
          >
            {message}
          </p>
        )}

        <Button className="w-full" onClick={save} loading={loading}>
          Guardar código QR
        </Button>
      </div>
    </div>
  );
}
