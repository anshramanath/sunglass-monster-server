import { NextRequest } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createUserClient } from "@/lib/supabase/user";
import { stripe } from "@/lib/stripe";
import { ok, err } from "@/lib/api";

export async function POST(req: NextRequest) {
  const client = await createUserClient(req);
  if (!client) return err("Unauthorized", 401);

  const body = await req.json();

  const brandSlug = body.brandSlug;
  if (!brandSlug) return err("brandSlug is required", 400);

  const { successUrl, cancelUrl } = body;
  if (!successUrl || !cancelUrl) return err("successUrl and cancelUrl are required", 400);

  const { submission : sub } = body;
  if (!sub) return err("submission is required", 400);

  const { packageId } = sub;
  if (!packageId) return err("packageId is required", 400);

  const adminSupabase = createAdminClient();

  const { data: pkg, error: pkgError } = await adminSupabase
    .from("tbyb_packages")
    .select("name, slug, image_src, brands, price_cents, pairs_min, pairs_max")
    .eq("id", packageId)
    .eq("brand_slug", brandSlug)
    .single();
    
  if (pkgError) return err("Failed to fetch package", 500);
  if (!pkg) return err("Package not found", 404);

  const formHash = crypto
    .createHash("sha256")
    .update(JSON.stringify({
      userId: client.user.id,
      packageName: pkg.name,
      packagePriceCents: pkg.price_cents,
      packagePairsMin: pkg.pairs_min,
      packagePairsMax: pkg.pairs_max,
      packageBrands: pkg.brands,
      packageImageSrc: pkg.image_src,
      odSphere: sub.odSphere,
      odCylinder: sub.odCylinder,
      odAxis: sub.odAxis,
      osSphere: sub.osSphere,
      osCylinder: sub.osCylinder,
      osAxis: sub.osAxis,
      lensType: sub.lensType,
      helmetSize: sub.helmetSize,
      hatSize: sub.hatSize,
      noseBridge: sub.noseBridge,
      sunglassFit: sub.sunglassFit,
      frameType: sub.frameType,
      comments: sub.comments,
      prescriptionUrl: sub.prescriptionUrl,
      headshotUrl: sub.headshotUrl,
      name: sub.name,
      email: sub.email,
      phone: sub.phone,
    }))
    .digest("hex");

  let submissionId: string;

  const { data: inserted, error } = await adminSupabase
    .from("tbyb_submissions")
    .insert({
      brand_slug: brandSlug,
      user_id: client.user.id,
      package_name: pkg.name,
      package_slug: pkg.slug,
      package_price_cents: pkg.price_cents,
      package_image_src: pkg.image_src,
      package_pairs_min: pkg.pairs_min,
      package_pairs_max: pkg.pairs_max,
      package_brands: pkg.brands,
      od_sphere: sub.odSphere,
      od_cylinder: sub.odCylinder,
      od_axis: sub.odAxis,
      os_sphere: sub.osSphere,
      os_cylinder: sub.osCylinder,
      os_axis: sub.osAxis,
      lens_type: sub.lensType,
      helmet_size: sub.helmetSize,
      hat_size: sub.hatSize,
      nose_bridge: sub.noseBridge,
      buying_preference: sub.sunglassFit,
      frame_type: sub.frameType,
      special_requests: sub.comments,
      prescription_url: sub.prescriptionUrl,
      headshot_url: sub.headshotUrl,
      contact_name: sub.name,
      contact_email: sub.email,
      contact_phone: sub.phone,
      status: "Unpaid",
      form_hash: formHash,
    })
    .select("id")
    .single();

  if (error) {
    // 23505 = unique_violation; reuse existing unpaid row → same idempotency key → same Stripe URL
    if (error.code === "23505") {
      const { data: existing, error: lookupError } = await adminSupabase
        .from("tbyb_submissions")
        .select("id")
        .eq("form_hash", formHash)
        .eq("brand_slug", brandSlug)
        .eq("status", "Unpaid")
        .single();

      if (lookupError) return err("Failed to create submission", 500);
      
      submissionId = existing.id;
    } else {
      return err(error.message, 500);
    }
  } else {
    submissionId = inserted!.id;
  }

  const shortId = "#" + submissionId.slice(-8).toUpperCase();

  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: "payment",
      client_reference_id: client.user.id,
      customer_email: sub.email,
      metadata: { type: "tbyb", submissionId, brandSlug },
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: {
            name: `${pkg.name} · ${pkg.pairs_min === pkg.pairs_max ? pkg.pairs_min : `${pkg.pairs_min}–${pkg.pairs_max}`} Pairs`,
            description: shortId,
            images: [pkg.image_src],
          },
          unit_amount: pkg.price_cents,
        },
        quantity: 1,
      }],
      shipping_address_collection: { allowed_countries: ["US"] },
      success_url: successUrl,
      cancel_url: cancelUrl,
    }, { idempotencyKey: submissionId });
  } catch {
    return err("Failed to create checkout session", 500);
  }

  if (!session.url) return err("Failed to create checkout session", 500);

  return ok({ url: session.url });
}
