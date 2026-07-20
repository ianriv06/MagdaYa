import { NextResponse } from "next/server";
import { sendOrderWhatsAppConfirmation } from "@/lib/whatsapp";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const phone = String(body.phone || "").trim();
    const orderId = String(body.orderId || "").trim();
    const restaurantName = String(body.restaurantName || "Restaurante").trim();
    const totalLabel = String(body.totalLabel || "").trim();
    const orderType =
      body.orderType === "pickup" ? "pickup" : ("delivery" as const);

    if (!phone || !orderId) {
      return NextResponse.json(
        { ok: false, error: "Faltan datos" },
        { status: 400 }
      );
    }

    const result = await sendOrderWhatsAppConfirmation({
      phone,
      orderId,
      restaurantName,
      totalLabel,
      orderType,
    });

    if (!result.ok) {
      console.error("[notify-order]", result);
    }

    return NextResponse.json(result, {
      status: result.ok || result.skipped ? 200 : 502,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
