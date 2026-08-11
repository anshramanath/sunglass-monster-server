"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";

export async function saveFulfillment(orderId: string, carrier: string, trackingNumber: string) {
  await requireAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("orders")
    .update({ carrier, tracking_number: trackingNumber, status: "shipped" })
    .eq("id", orderId);

  if (error) throw new Error("Failed to save fulfillment");
}

export async function undoFulfillment(orderId: string) {
  await requireAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("orders")
    .update({ carrier: null, tracking_number: null, status: "processing" })
    .eq("id", orderId);
    
  if (error) throw new Error("Failed to undo fulfillment");
}

export async function getOrders(brandSlug: string) {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("orders")
    .select(`
      id, status, total_cents, refunded_cents, carrier, tracking_number, shipping_address, stripe_payment_intent, veeqo_order_id, veeqo_error, created_at,
      order_items(id, name, sku, image_src, price_cents, quantity, attribute)
    `)
    .eq("brand_slug", brandSlug)
    .order("created_at", { ascending: false });

  if (error) throw new Error("Failed to fetch orders");

  return data.map((o) => ({
    id: o.id,
    status: o.status as "processing" | "shipped" | "refunded",
    totalCents: o.total_cents,
    refundedCents: o.refunded_cents,
    carrier: o.carrier,
    trackingNumber: o.tracking_number,
    shippingAddress: o.shipping_address as {
      name: string;
      line1: string;
      line2?: string;
      city: string;
      state: string;
      postal_code: string;
      country: string;
    },
    paymentIntent: o.stripe_payment_intent as string,
    veeqoOrderId: o.veeqo_order_id,
    veeqoError: o.veeqo_error,
    createdAt: o.created_at,
    items: o.order_items.map((i) => ({
      id: i.id,
      name: i.name,
      sku: i.sku,
      imageSrc: i.image_src,
      priceCents: i.price_cents,
      quantity: i.quantity,
      attribute: i.attribute,
    })),
  }));
}
