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

  const supabase = createAdminClient();

  const { data: pkg } = await supabase.from("tbyb_packages").select("name, slug, image_src, brands, price_cents, pairs_min, pairs_max").eq("id", packageId).eq("brand_slug", brandSlug).single();
  if (!pkg) return err("Package not found", 404);

  const { data: submission, error } = await supabase.from("tbyb_submissions").insert({
    brand_slug: brandSlug,
    user_id: client.user.id,
    package_name: pkg.name,
    package_slug: pkg.slug,
    package_price_cents: pkg.price_cents,
    package_image_src: pkg.image_src,
    package_pairs_min: pkg.pairs_min,
    package_pairs_max: pkg.pairs_max,
    package_brands: pkg.brands,
    od_sphere: body.odSphere ?? null,
    od_cylinder: body.odCylinder ?? null,
    od_axis: body.odAxis ?? null,
    os_sphere: body.osSphere ?? null,
    os_cylinder: body.osCylinder ?? null,
    os_axis: body.osAxis ?? null,
    lens_type: body.lensType ?? null,
    helmet_size: body.helmetSize ?? null,
    hat_size: body.hatSize ?? null,
    nose_bridge: body.noseBridge ?? null,
    buying_preference: body.sunglassFit ?? null,
    frame_type: body.frameType ?? null,
    special_requests: body.comments ?? null,
    prescription_url: body.prescriptionUrl ?? null,
    headshot_url: body.headshotUrl ?? null,
    contact_email: email,
    contact_phone: body.phone ?? null,
    status: "pending",
  }).select("id").single();

  if (error) return err(error.message, 500);

  return ok({ id: submission.id });
}
