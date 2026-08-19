import { NextRequest } from "next/server";
import { createUserClient } from "@/lib/supabase/user";
import { ok, err } from "@/lib/api";

export async function POST(req: NextRequest) {
  const client = await createUserClient(req);
  if (!client) return err("Unauthorized", 401);

  const body = await req.json();

  const brandSlug = body.brandSlug;
  if (!brandSlug) return err("brandSlug is required", 400);

  const { supabase } = client;

  const { data, error } = await supabase
    .from("rx_orders")
    .select(
      `id, status, frame_name, frame_image_src, frame_color,
      total_price_cents, deposit_used_cents, stripe_charge_cents, refunded_cents,
      carrier, tracking_number,
      vision_type,
      od_sphere, od_cylinder, od_axis,
      os_sphere, os_cylinder, os_axis,
      pd_mode, pd, pd_left, pd_right,
      lens_material, lens_color_category, lens_color,
      ar_coating, scratch_coating, mirror_coating,
      comments, prescription_url, headshot_url,
      contact_name, contact_email, contact_phone,
      shipping_address,
      created_at`
    )
    .eq("brand_slug", brandSlug)
    .order("created_at", { ascending: false });

  if (error) return err("Failed to fetch rx orders", 500);

  return ok(data.map((o) => ({
    id: o.id,
    status: o.status,
    frameName: o.frame_name,
    frameImageSrc: o.frame_image_src,
    frameColor: o.frame_color,
    totalPriceCents: o.total_price_cents,
    depositUsedCents: o.deposit_used_cents,
    stripeChargeCents: o.stripe_charge_cents,
    refundedCents: o.refunded_cents,
    carrier: o.carrier,
    trackingNumber: o.tracking_number,
    visionType: o.vision_type,
    odSphere: o.od_sphere, odCylinder: o.od_cylinder, odAxis: o.od_axis,
    osSphere: o.os_sphere, osCylinder: o.os_cylinder, osAxis: o.os_axis,
    pdMode: o.pd_mode, pd: o.pd, pdLeft: o.pd_left, pdRight: o.pd_right,
    lensMaterial: o.lens_material, lensColorCategory: o.lens_color_category, lensColor: o.lens_color,
    arCoating: o.ar_coating, scratchCoating: o.scratch_coating, mirrorCoating: o.mirror_coating,
    comments: o.comments, prescriptionUrl: o.prescription_url, headshotUrl: o.headshot_url,
    contactName: o.contact_name, contactEmail: o.contact_email, contactPhone: o.contact_phone,
    shippingAddress: o.shipping_address,
    createdAt: o.created_at,
  })));
}
