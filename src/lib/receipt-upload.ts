/** Compress an image file to a JPEG data URL (for DB storage when Storage buckets are missing). */
export async function fileToCompressedDataUrl(
  file: File,
  maxWidth = 900,
  quality = 0.65
): Promise<string> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxWidth / bitmap.width);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      throw new Error("No se pudo procesar la imagen");
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    let q = quality;
    let dataUrl = canvas.toDataURL("image/jpeg", q);
    // Keep under ~400KB so PostgREST / DB inserts stay reliable
    while (dataUrl.length > 400_000 && q > 0.35) {
      q -= 0.1;
      dataUrl = canvas.toDataURL("image/jpeg", q);
    }
    return dataUrl;
  } catch {
    // Fallback for formats browsers can't decode in canvas (e.g. some HEIC)
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () =>
        reject(new Error("No se pudo leer el comprobante"));
      reader.readAsDataURL(file);
    });
  }
}

export function isBucketNotFoundError(err: unknown) {
  if (!err || typeof err !== "object") return false;
  const e = err as {
    message?: string;
    statusCode?: string | number;
    error?: string;
  };
  const msg = `${e.message ?? ""} ${e.error ?? ""}`.toLowerCase();
  return (
    msg.includes("bucket not found") ||
    (msg.includes("not found") && msg.includes("bucket")) ||
    e.statusCode === 404 ||
    e.statusCode === "404"
  );
}

export function formatCheckoutError(err: unknown): string {
  if (!err) return "No se pudo hacer el pedido";
  if (typeof err === "string" && err.trim()) return err;
  if (err instanceof Error && err.message.trim()) return err.message;

  if (typeof err === "object" && err !== null) {
    const o = err as Record<string, unknown>;
    const parts = [o.message, o.details, o.hint, o.error, o.code]
      .filter((p): p is string => typeof p === "string" && p.trim().length > 0);
    if (parts.length) {
      const text = parts.join(" — ");
      if (/column .*whatsapp|whatsapp.*column/i.test(text)) {
        return "Falta la columna whatsapp en la base de datos. Ejecuta supabase/ensure-order-checkout-columns.sql en Supabase.";
      }
      if (/column .*payment_receipt|payment_receipt.*column/i.test(text)) {
        return "Falta la columna payment_receipt_url. Ejecuta supabase/ensure-order-checkout-columns.sql en Supabase.";
      }
      if (/row-level security|rls/i.test(text)) {
        return "No tienes permiso para crear pedidos. Entra con una cuenta de Cliente.";
      }
      return text;
    }
  }

  return "No se pudo hacer el pedido";
}

export function isMissingColumnError(err: unknown, column: string) {
  if (!err || typeof err !== "object") return false;
  const o = err as Record<string, unknown>;
  const raw = [o.message, o.details, o.hint, o.code]
    .filter((p): p is string => typeof p === "string")
    .join(" ")
    .toLowerCase();
  const col = column.toLowerCase();
  return (
    raw.includes(col) &&
    (raw.includes("column") ||
      raw.includes("does not exist") ||
      raw.includes("schema cache"))
  );
}
