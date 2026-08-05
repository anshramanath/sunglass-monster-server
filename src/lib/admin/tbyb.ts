"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import type { TbybSubmission } from "@/lib/types";

export async function getTbybSubmissions(brandSlug: string): Promise<TbybSubmission[]> {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("tbyb_submissions")
    .select(
      "id, created_at, status, refunded_cents, contact_name, contact_email, contact_phone, package_name, package_price_cents, package_pairs_min, package_pairs_max, package_brands, od_sphere, od_cylinder, od_axis, os_sphere, os_cylinder, os_axis, lens_type, helmet_size, hat_size, nose_bridge, buying_preference, frame_type, special_requests, prescription_url, headshot_url, shipping_address"
    )
    .eq("brand_slug", brandSlug)
    .order("created_at", { ascending: false });

  if (error) throw new Error("Failed to fetch TBYB submissions");

  return data.map((s) => ({
    id: s.id,
    createdAt: s.created_at,
    status: s.status,
    refundedCents: s.refunded_cents,
    contactName: s.contact_name,
    contactEmail: s.contact_email,
    contactPhone: s.contact_phone,
    packageName: s.package_name,
    packagePriceCents: s.package_price_cents,
    packagePairsMin: s.package_pairs_min,
    packagePairsMax: s.package_pairs_max,
    packageBrands: s.package_brands,
    odSphere: s.od_sphere,
    odCylinder: s.od_cylinder,
    odAxis: s.od_axis,
    osSphere: s.os_sphere,
    osCylinder: s.os_cylinder,
    osAxis: s.os_axis,
    lensType: s.lens_type,
    helmetSize: s.helmet_size,
    hatSize: s.hat_size,
    noseBridge: s.nose_bridge,
    buyingPreference: s.buying_preference,
    frameType: s.frame_type,
    specialRequests: s.special_requests,
    prescriptionUrl: s.prescription_url,
    headshotUrl: s.headshot_url,
    shippingAddress: s.shipping_address,
  }));
}

export async function updateTbybStatus(id: string, status: string) {
  await requireAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("tbyb_submissions")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error("Failed to update TBYB status");
}
