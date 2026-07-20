import { createClient } from "@/lib/supabase/client";
import type { PaymentPayeeType } from "@/lib/types";

export async function requestOrderPayment(params: {
  orderId: string;
  payeeType: PaymentPayeeType;
  payeeUserId: string;
  amount: number;
  qrImageUrl: string | null;
  restaurantId?: string | null;
  driverId?: string | null;
}) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("payment_requests")
    .insert({
      order_id: params.orderId,
      payee_type: params.payeeType,
      payee_user_id: params.payeeUserId,
      restaurant_id: params.restaurantId ?? null,
      driver_id: params.driverId ?? null,
      amount: params.amount,
      qr_image_url: params.qrImageUrl,
      status: "pending",
    })
    .select()
    .single();

  return { data, error };
}

export const PAYMENT_REQUEST_STATUS_LABELS = {
  pending: "Pago solicitado",
  paid: "Pagado",
  rejected: "Rechazado",
} as const;
