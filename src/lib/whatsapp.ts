/** Normalize a Bolivian (or already E.164) phone to digits for WhatsApp API. */
export function toWhatsAppNumber(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  // Local 8-digit mobile → add Bolivia country code
  if (digits.length === 8) digits = `591${digits}`;
  // Strip leading 00
  if (digits.startsWith("00")) digits = digits.slice(2);
  return digits;
}

export type OrderWhatsAppPayload = {
  phone: string;
  orderId: string;
  restaurantName: string;
  totalLabel: string;
  orderType: "delivery" | "pickup";
};

function buildConfirmationText(p: OrderWhatsAppPayload) {
  const shortId = p.orderId.slice(0, 8).toUpperCase();
  const mode = p.orderType === "delivery" ? "Domicilio" : "Para recoger";
  return [
    `¡Pedido recibido en MagdaYa! ✅`,
    ``,
    `Pedido #${shortId}`,
    `Restaurante: ${p.restaurantName}`,
    `Tipo: ${mode}`,
    `Total: ${p.totalLabel}`,
    ``,
    `Te avisaremos cuando tu pedido sea confirmado.`,
  ].join("\n");
}

/**
 * Send order confirmation via WhatsApp Cloud API (Meta).
 * Requires env:
 *   WHATSAPP_TOKEN
 *   WHATSAPP_PHONE_NUMBER_ID
 * Optional:
 *   WHATSAPP_TEMPLATE_NAME  — if set, sends an approved template instead of free text
 *   WHATSAPP_TEMPLATE_LANG  — default "es"
 */
export async function sendOrderWhatsAppConfirmation(
  payload: OrderWhatsAppPayload
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    return {
      ok: false,
      skipped: true,
      error:
        "WhatsApp no configurado (falta WHATSAPP_TOKEN o WHATSAPP_PHONE_NUMBER_ID)",
    };
  }

  const to = toWhatsAppNumber(payload.phone);
  if (to.length < 10) {
    return { ok: false, error: "Número de WhatsApp inválido" };
  }

  const templateName = process.env.WHATSAPP_TEMPLATE_NAME?.trim();
  const templateLang = process.env.WHATSAPP_TEMPLATE_LANG?.trim() || "es";

  const body = templateName
    ? {
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: templateName,
          language: { code: templateLang },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: payload.orderId.slice(0, 8).toUpperCase() },
                { type: "text", text: payload.restaurantName },
                { type: "text", text: payload.totalLabel },
              ],
            },
          ],
        },
      }
    : {
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: {
          preview_url: false,
          body: buildConfirmationText(payload),
        },
      };

  const res = await fetch(
    `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  const data = (await res.json().catch(() => ({}))) as {
    error?: { message?: string };
    messages?: unknown[];
  };

  if (!res.ok) {
    return {
      ok: false,
      error: data.error?.message || `WhatsApp API error ${res.status}`,
    };
  }

  return { ok: true };
}
