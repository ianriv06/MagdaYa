/** Compress an image file to a JPEG data URL (for DB storage when Storage buckets are missing). */
export async function fileToCompressedDataUrl(
  file: File,
  maxWidth = 1200,
  quality = 0.72
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

    return canvas.toDataURL("image/jpeg", quality);
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
  const e = err as { message?: string; statusCode?: string | number; error?: string };
  const msg = `${e.message ?? ""} ${e.error ?? ""}`.toLowerCase();
  return (
    msg.includes("bucket not found") ||
    (msg.includes("not found") && msg.includes("bucket")) ||
    e.statusCode === 404 ||
    e.statusCode === "404"
  );
}
