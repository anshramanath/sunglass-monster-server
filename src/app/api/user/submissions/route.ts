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
    .from("tbyb_submissions")
    .select("id, status, created_at, package_name, package_price_cents, package_pairs_min, package_pairs_max, package_brands, package_image_src, od_sphere, od_cylinder, od_axis, os_sphere, os_cylinder, os_axis, lens_type, helmet_size, hat_size, nose_bridge, buying_preference, frame_type, special_requests, prescription_url, headshot_url, contact_name, contact_email, contact_phone")
    .eq("brand_slug", brandSlug)
    .order("created_at", { ascending: false });

  if (error) return err("Failed to fetch submissions", 500);

  const submissions = (data ?? []).map((s) => ({
    id: s.id,
    status: s.status,
    createdAt: s.created_at,
    packageName: s.package_name,
    packagePriceCents: s.package_price_cents,
    packagePairsMin: s.package_pairs_min,
    packagePairsMax: s.package_pairs_max,
    packageBrands: s.package_brands,
    packageImageSrc: s.package_image_src,
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
    contactName: s.contact_name,
    contactEmail: s.contact_email,
    contactPhone: s.contact_phone,
  }));

  return ok(submissions);
}
