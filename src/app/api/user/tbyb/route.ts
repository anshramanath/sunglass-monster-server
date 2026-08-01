import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createUserClient } from "@/lib/supabase/user";
import { ok, err } from "@/lib/api";

export async function POST(req: NextRequest) {
  const client = await createUserClient(req);
  if (!client) return err("Unauthorized", 401);

  const body = await req.json();

  const brandSlug = body.brandSlug;
  if (!brandSlug) return err("brandSlug is required", 400);

  const email = body.email;
  if (!email) return err("email is required", 400);

  const packageId = body.packageId;
  if (!packageId) return err("packageId is required", 400);

  const adminSupabase = createAdminClient();

  const { data: pkg } = await adminSupabase.from("tbyb_packages").select("name, slug, image_src, brands, price_cents, pairs_min, pairs_max").eq("id", packageId).eq("brand_slug", brandSlug).single();
  if (!pkg) return err("Package not found", 404);

  const { supabase : userSupabase } = client;

  const { data: submission, error } = await userSupabase.from("tbyb_submissions").insert({
    brand_slug: brandSlug,
    user_id: client.user.id,
    package_name: pkg.name,
    package_slug: pkg.slug,
    package_price_cents: pkg.price_cents,
    package_image_src: pkg.image_src,
    package_pairs_min: pkg.pairs_min,
    package_pairs_max: pkg.pairs_max,
    package_brands: pkg.brands,
    od_sphere: body.odSphere,
    od_cylinder: body.odCylinder,
    od_axis: body.odAxis,
    os_sphere: body.osSphere,
    os_cylinder: body.osCylinder,
    os_axis: body.osAxis,
    lens_type: body.lensType,
    helmet_size: body.helmetSize,
    hat_size: body.hatSize,
    nose_bridge: body.noseBridge,
    buying_preference: body.sunglassFit,
    frame_type: body.frameType,
    special_requests: body.comments,
    prescription_url: body.prescriptionUrl,
    headshot_url: body.headshotUrl,
    contact_email: email,
    contact_phone: body.phone,
    status: "pending",
  }).select("id").single();

  if (error) return err(error.message, 500);

  return ok({ id: submission.id });
}
