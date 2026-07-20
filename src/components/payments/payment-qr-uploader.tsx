"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  fileToCompressedDataUrl,
  isBucketNotFoundError,
} from "@/lib/receipt-upload";
import { cn } from "@/lib/utils";

/** Upload a payout QR image; returns a public URL or data URL fallback. */
export async function uploadPaymentQr(
  userId: string,
  file: File
): Promise<string> {
  const supabase = createClient();
  const ext = file.name.split(".").pop() || "jpg";
  const path = `payee/${userId}/qr-${Date.now()}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from("payment-qr")
    .upload(path, file, { upsert: true });

  if (upErr) {
    if (!isBucketNotFoundError(upErr)) throw upErr;
    return fileToCompressedDataUrl(file, 900, 0.78);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("payment-qr").getPublicUrl(path);
  return publicUrl;
}

export function PaymentQrUploader({
  value,
  onChange,
  label = "QR de cobro",
  hint = "Sube la foto de tu QR bancario o de billetera. MagdaYa te pagará escaneando este código.",
  required = false,
  className,
}: {
  value: string;
  onChange: (url: string, file?: File | null) => void;
  label?: string;
  hint?: string;
  required?: boolean;
  className?: string;
}) {
  const [localPreview, setLocalPreview] = useState("");
  const preview = localPreview || value;

  return (
    <div className={cn("space-y-2", className)}>
      <div>
        <p className="text-sm font-semibold text-ink">
          {label}
          {required ? <span className="text-danger"> *</span> : null}
        </p>
        <p className="text-xs text-muted mt-0.5">{hint}</p>
      </div>
      <label className="relative block aspect-square max-w-[220px] rounded-2xl border border-dashed border-border bg-subtle overflow-hidden cursor-pointer hover:border-ink transition-colors">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="QR de cobro"
            className="absolute inset-0 w-full h-full object-contain bg-white p-3"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted text-sm px-4 text-center">
            <Upload className="size-7 opacity-50" />
            <span className="font-medium text-ink">Subir foto del QR</span>
            <span className="text-xs">JPG, PNG o WebP</span>
          </div>
        )}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          className="absolute inset-0 opacity-0 cursor-pointer"
          required={required && !preview}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const url = URL.createObjectURL(file);
            setLocalPreview(url);
            onChange(url, file);
          }}
        />
      </label>
      {preview && (
        <button
          type="button"
          className="text-xs text-muted font-medium underline"
          onClick={() => {
            setLocalPreview("");
            onChange("", null);
          }}
        >
          Quitar QR
        </button>
      )}
    </div>
  );
}
