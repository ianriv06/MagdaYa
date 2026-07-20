/** Normalize a Bolivian (or already E.164) phone to digits for WhatsApp API. */
export function toWhatsAppNumber(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  // Strip leading 00
  if (digits.startsWith("00")) digits = digits.slice(2);
  // Local 8-digit mobile → add Bolivia country code
  if (digits.length === 8) digits = `591${digits}`;
  // 9 digits starting with 0 → drop leading 0 then add 591
  if (digits.length === 9 && digits.startsWith("0")) {
    digits = `591${digits.slice(1)}`;
  }
  return digits;
}

export type OrderWhatsAppPayload = {
  phone: string;
  orderId: string;
  restaurantName: string;
  totalLabel: string;
  orderType: "delivery" | "pickup";
};

export type WhatsAppSendResult = {
  ok: boolean;
  skipped?: boolean;
  error?: string;
  code?: number;
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

type GraphError = {
  message?: string;
  type?: string;
  code?: number;
  error_subcode?: number;
  error_data?: { details?: string };
};

async function postWhatsAppMessage(
  phoneNumberId: string,
  token: string,
  body: Record<string, unknown>
): Promise<{ ok: boolean; error?: string; code?: number; raw?: unknown }> {
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
    error?: GraphError;
    messages?: unknown[];
  };

  if (!res.ok || data.error) {
    const err = data.error || {};
    const details = err.error_data?.details;
    const message = [err.message, details].filter(Boolean).join(" — ");
    return {
      ok: false,
      error: message || `WhatsApp API error ${res.status}`,
      code: err.code,
      raw: data,
    };
  }

  return { ok: true, raw: data };
}

/**
 * Send order confirmation via WhatsApp Cloud API (Meta).
 *
 * Env:
 *   WHATSAPP_TOKEN
 *   WHATSAPP_PHONE_NUMBER_ID
 * Optional:
 *   WHATSAPP_TEMPLATE_NAME — approved template (recommended for production)
 *   WHATSAPP_TEMPLATE_LANG — default "es"
 */
export async function sendOrderWhatsAppConfirmation(
  payload: OrderWhatsAppPayload
): Promise<WhatsAppSendResult> {
  const token = process.env.WHATSAPP_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();

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
    return { ok: false, error: `Número de WhatsApp inválido: ${payload.phone}` };
  }

  const templateName = process.env.WHATSAPP_TEMPLATE_NAME?.trim();
  const templateLang = process.env.WHATSAPP_TEMPLATE_LANG?.trim() || "es";

  // Preferred: approved template (works outside the 24h window)
  if (templateName) {
    const templated = await postWhatsAppMessage(phoneNumberId, token, {
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
              {
                type: "text",
                text: payload.orderId.slice(0, 8).toUpperCase(),
              },
              { type: "text", text: payload.restaurantName },
              { type: "text", text: payload.totalLabel },
            ],
          },
        ],
      },
    });
    if (templated.ok) return { ok: true };
    // Fall through to free text / hello_world if template fails
    console.error("WhatsApp template failed:", templated.error, templated.code);
  }

  // Free-form text (only works for test recipients / open customer-care window)
  const textResult = await postWhatsAppMessage(phoneNumberId, token, {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: {
      preview_url: false,
      body: buildConfirmationText(payload),
    },
  });

  if (textResult.ok) return { ok: true };

  console.error("WhatsApp text failed:", textResult.error, textResult.code);

  // Auth failure — token expired / invalid
  if (textResult.code === 190) {
    return {
      ok: false,
      code: 190,
      error:
        "Token de WhatsApp inválido o expirado. Genera uno nuevo en Meta → WhatsApp → API Setup.",
    };
  }

  // Recipient not allowed (dev mode) — common when number isn't added as test recipient
  if (textResult.code === 131030 || textResult.code === 133010) {
    return {
      ok: false,
      code: textResult.code,
      error:
        "Tu número no está en la lista de prueba de Meta. Agrégalo en WhatsApp → API Setup → To.",
    };
  }

  // Fallback: Meta's default hello_world template (works for added test numbers)
  const hello = await postWhatsAppMessage(phoneNumberId, token, {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: "hello_world",
      language: { code: "en_US" },
    },
  });

  if (hello.ok) {
    return { ok: true };
  }

  console.error("WhatsApp hello_world failed:", hello.error, hello.code);

  return {
    ok: false,
    code: hello.code ?? textResult.code,
    error: hello.error || textResult.error || "No se pudo enviar WhatsApp",
  };
}
