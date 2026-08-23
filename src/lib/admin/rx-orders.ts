"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import type { RxOrder } from "@/lib/types";

export async function getRxOrders(brandSlug: string): Promise<RxOrder[]> {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("rx_orders")
    .select(
      `id,
      frame_name, frame_slug, frame_image_src, frame_price_cents, frame_color,
      total_price_cents, deposit_used_cents, stripe_charge_cents,
      status, stripe_payment_intent, refunded_cents, shipping_address,
      vision_type,
      od_sphere, od_cylinder, od_axis,
      os_sphere, os_cylinder, os_axis,
      pd_mode, pd, pd_left, pd_right,
      lens_material, lens_color_category, lens_color,
      ar_coating, scratch_coating, mirror_coating,
      carrier, tracking_number,
      comments, prescription_url, headshot_url,
      contact_name, contact_email, contact_phone,
      created_at`
    )
    .eq("brand_slug", brandSlug)
    .order("created_at", { ascending: false });

  if (error) throw new Error("Failed to fetch rx orders");

  return data.map((o) => ({
    id: o.id,
    frameName: o.frame_name,
    frameSlug: o.frame_slug,
    frameImageSrc: o.frame_image_src,
    framePriceCents: o.frame_price_cents,
    frameColor: o.frame_color,
    totalPriceCents: o.total_price_cents,
    depositUsedCents: o.deposit_used_cents,
    stripeChargeCents: o.stripe_charge_cents,
    status: o.status,
    stripePaymentIntent: o.stripe_payment_intent,
    refundedCents: o.refunded_cents,
    shippingAddress: o.shipping_address,
    visionType: o.vision_type,
    odSphere: o.od_sphere,
    odCylinder: o.od_cylinder,
    odAxis: o.od_axis,
    osSphere: o.os_sphere,
    osCylinder: o.os_cylinder,
    osAxis: o.os_axis,
    pdMode: o.pd_mode,
    pd: o.pd,
    pdLeft: o.pd_left,
    pdRight: o.pd_right,
    lensMaterial: o.lens_material,
    lensColorCategory: o.lens_color_category,
    lensColor: o.lens_color,
    arCoating: o.ar_coating,
    scratchCoating: o.scratch_coating,
    mirrorCoating: o.mirror_coating,
    carrier: o.carrier,
    trackingNumber: o.tracking_number,
    comments: o.comments,
    prescriptionUrl: o.prescription_url,
    headshotUrl: o.headshot_url,
    contactName: o.contact_name,
    contactEmail: o.contact_email,
    contactPhone: o.contact_phone,
    createdAt: o.created_at,
  }));
}

export async function updateRxStatus(id: string, status: string) {
  await requireAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("rx_orders")
    .update({ status })
    .eq("id", id);

  if (error) throw new Error("Failed to update rx order status");
}

export async function saveRxFulfillment(id: string, carrier: string, trackingNumber: string) {
  await requireAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("rx_orders")
    .update({ carrier, tracking_number: trackingNumber })
    .eq("id", id);

  if (error) throw new Error("Failed to save rx fulfillment");
}

export async function undoRxFulfillment(id: string) {
  await requireAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("rx_orders")
    .update({ carrier: null, tracking_number: null })
    .eq("id", id);

  if (error) throw new Error("Failed to undo rx fulfillment");
}
