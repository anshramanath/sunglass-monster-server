import { NextRequest } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createUserClient } from "@/lib/supabase/user";
import { stripe } from "@/lib/stripe";
import { ok, err } from "@/lib/api";

const VISION_TYPE_PRICES: Record<string, number> = {
  "Traditional Single Vision (+$99)": 9900,
  "Digital Single Vision w/ Wider Peripheral (+$129)": 12900,
  "Digital Progressives (+$249)": 24900,
  "Digital Sport Progressives (+$359)": 35900,
  "FT 28 Bifocals (+$159)": 15900,
};

const LENS_MATERIAL_PRICES: Record<string, number> = {
  "Impact Resistant Polycarbonate": 0,
  "Impact Resistant Trivex (+$39)": 3900,
};

const LENS_COLOR_PRICES: Record<string, number> = {
  "Gen8 Clear to Grey ($99)": 9900,
  "Gen8 Clear to Brown ($99)": 9900,
  "Gen8 Clear to Amber ($99)": 9900,
  "Gen8 Clear to Graphite Green ($99)": 9900,
  "Gen8 Clear to Amethyst Purple ($99)": 9900,
  "Gen8 Clear to Emerald Green ($99)": 9900,
  "Gen8 Clear to Sapphire Blue ($99)": 9900,
  "XtrActive Darkest Clear to Dark Gray ($119)": 11900,
  "XtrActive Clear to Dark Brown ($119)": 11900,
  "XtrActive Polarized Clear to Gray ($169)": 16900,
  "Polarized Gray (+$79)": 7900,
  "Polarized Brown (+$79)": 7900,
  "Dark Gray (+$15)": 1500,
  "Light Gray (+$15)": 1500,
  "Dark Brown (+$15)": 1500,
  "Light Brown (+$15)": 1500,
  "G-15 Gray/Green (+$15)": 1500,
  "HD Copper (+$15)": 1500,
  "Yellow (+$15)": 1500,
  "Rose (+$15)": 1500,
  "Blue (+$15)": 1500,
  "Purple (+$15)": 1500,
  "Clear / No Tint": 0,
  "None": 0,
};

const AR_COATING_PRICES: Record<string, number> = {
  "Classic A/R: Basic A/R w/ Standard Oleophobic, Hydrophobic Coat & Scratch Coat (+$79)": 7900,
  "Elite A/R: Superior A/R w/ Best Oleo/Hydrophobic Coat & Scratch Coat (+$99)": 9900,
  "Elite A/R + Anti Fog: Includes Permanent Anti-Fog Coat + 2 yr Scratch Warranty (+$159)": 15900,
  "None": 0,
};

const SCRATCH_COAT_PRICES: Record<string, number> = {
  "Multi Layer Baked On Ultimate Scratch Coat (+$39)": 3900,
  "None": 0,
};

const MIRROR_COAT_PRICES: Record<string, number> = {
  "Flash Style Mirror Silver (+$65)": 6500,
  "Flash Style Mirror Gold (+$65)": 6500,
  "Flash Style Mirror Blue (+$65)": 6500,
  "Flash Style Mirror Green (+$65)": 6500,
  "Flash Style Mirror Cobalt (+$65)": 6500,
  "Flash Style Mirror Red (+$65)": 6500,
  "Flash Style Mirror Pink (+$65)": 6500,
  "Solid Mirror Silver (+$65)": 6500,
  "Solid Mirror Black (+$65)": 6500,
  "Solid Mirror Gold (+$65)": 6500,
  "Solid Mirror Blue (+$65)": 6500,
  "Solid Mirror Cobalt (+$65)": 6500,
  "Solid Mirror Green (+$65)": 6500,
  "Solid Mirror Orange (+$65)": 6500,
  "Solid Mirror Red (+$65)": 6500,
  "Solid Mirror Pink (+$65)": 6500,
  "None": 0,
};

export async function POST(req: NextRequest) {
  const client = await createUserClient(req);
  if (!client) return err("Unauthorized", 401);

  const body = await req.json();

  const brandSlug = body.brandSlug;
  if (!brandSlug) return err("brandSlug is required", 400);

  const submission = body.submission;
  if (!submission) return err("submission is required", 400);

  const successUrl = body.successUrl;
  if (!successUrl) return err("successUrl is required", 400);

  const cancelUrl = body.cancelUrl;
  if (!cancelUrl) return err("cancelUrl is required", 400);

  const adminSupabase = createAdminClient();

  // Look up frame
  const { data: frame, error: frameError } = await adminSupabase
    .from("prescription_frames")
    .select("name, slug, price_cents, image_src, colors")
    .eq("id", submission.frameId)
    .eq("brand_slug", brandSlug)
    .single();

  if (frameError?.code === "PGRST116") return err("Frame not found", 404);
  if (frameError) return err(frameError.message, 500);

  const frameColor = (frame.colors as { option: string; slug: string }[]).find(
    (c) => c.slug === submission.frameColorSlug
  );
  if (!frameColor) return err("Invalid frame color", 400);

  const visionTypePrice = VISION_TYPE_PRICES[submission.visionType];
  const lensMaterialPrice = LENS_MATERIAL_PRICES[submission.lensMaterial];
  const lensColorPrice = LENS_COLOR_PRICES[submission.lensColor];
  const arCoatingPrice = AR_COATING_PRICES[submission.arCoating];
  const scratchCoatingPrice = SCRATCH_COAT_PRICES[submission.scratchCoating];
  const mirrorCoatingPrice = MIRROR_COAT_PRICES[submission.mirrorCoating];

  if (
    visionTypePrice === undefined ||
    lensMaterialPrice === undefined ||
    lensColorPrice === undefined ||
    arCoatingPrice === undefined ||
    scratchCoatingPrice === undefined ||
    mirrorCoatingPrice === undefined
  ) return err("Invalid lens option", 400);

  const addonCents = visionTypePrice + lensMaterialPrice + lensColorPrice + arCoatingPrice + scratchCoatingPrice + mirrorCoatingPrice;
  const totalPriceCents = frame.price_cents + addonCents;

  // Resolve TBYB submission if provided
  let tbybSub: { id: string; deposit_cents: number; deposit_used_cents: number; deposit_left_cents: number; open_stripe_session_id: string | null } | null = null;

  if (submission.tbybSubmissionId) {
    const { supabase: userSupabase } = client;

    const { data: subs } = await userSupabase
      .from("tbyb_submissions")
      .select("id, deposit_cents, refunded_cents, open_stripe_session_id")
      .eq("brand_slug", brandSlug);

    const match = (subs ?? []).find(
      (s) => s.id.slice(-8).toUpperCase() === submission.tbybSubmissionId.toUpperCase()
    );

    if (!match) return err("TBYB submission not found", 404);

    const available = Math.max(match.deposit_cents - (match.refunded_cents ?? 0), 0);

    if (submission.depositCents !== available || submission.depositCents === 0) {
      return err("Deposit amount has changed", 422, { depositCents: available });
    }

    const depositUsed = Math.min(available, totalPriceCents);
    tbybSub = { id: match.id, deposit_cents: available, deposit_used_cents: depositUsed, deposit_left_cents: match.deposit_cents - depositUsed, open_stripe_session_id: match.open_stripe_session_id };
  }

  const depositCents = tbybSub?.deposit_cents ?? 0;
  const chargeCents = Math.max(totalPriceCents - depositCents, 50);

  const { user } = client;

  const orderRow = {
    brand_slug: brandSlug,
    user_id: user!.id,
    frame_name: frame.name,
    frame_slug: frame.slug,
    frame_image_src: frame.image_src,
    frame_price_cents: frame.price_cents,
    frame_color: frameColor.option,
    total_price_cents: totalPriceCents,
    deposit_used_cents: tbybSub?.deposit_used_cents ?? null,
    stripe_charge_cents: chargeCents,
    vision_type: submission.visionType,
    od_sphere: submission.odSphere,
    od_cylinder: submission.odCylinder,
    od_axis: submission.odAxis,
    os_sphere: submission.osSphere,
    os_cylinder: submission.osCylinder,
    os_axis: submission.osAxis,
    pd_mode: submission.pdMode,
    pd: submission.pd,
    pd_left: submission.pdLeft,
    pd_right: submission.pdRight,
    lens_material: submission.lensMaterial,
    lens_color_category: submission.lensColorCategory,
    lens_color: submission.lensColor,
    ar_coating: submission.arCoating,
    scratch_coating: submission.scratchCoating,
    mirror_coating: submission.mirrorCoating,
    comments: submission.comments,
    prescription_url: submission.prescriptionUrl,
    headshot_url: submission.headshotUrl,
    contact_name: submission.name,
    contact_email: submission.email,
    contact_phone: submission.phone,
  };

  const formHash = crypto
    .createHash("sha256")
    .update(JSON.stringify(orderRow))
    .digest("hex");

  let orderId: string;

  const { data: inserted, error: insertError } = await adminSupabase
    .from("rx_orders")
    .insert({ ...orderRow, form_hash: formHash, status: "Unpaid" })
    .select("id")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      const { data: existing, error: lookupError } = await adminSupabase
        .from("rx_orders")
        .select("id")
        .eq("form_hash", formHash)
        .eq("status", "Unpaid")
        .single();

      if (lookupError) return err("Failed to create order", 500);
      orderId = existing.id;
    } else {
      return err(insertError.message, 500);
    }
  } else {
    orderId = inserted!.id;
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: chargeCents,
        product_data: {
          name: frame.name,
          images: [frame.image_src],
        },
      },
    }],
    metadata: {
      brandSlug,
      type: "rx-order",
      rxOrderId: orderId,
      ...(tbybSub && {
        tbybSubmissionId: tbybSub.id,
        depositLeftCents: String(tbybSub.deposit_left_cents),
      }),
    },
    customer_email: client.user.email,
    client_reference_id: user!.id,
    success_url: successUrl,
    cancel_url: cancelUrl,
    billing_address_collection: "required",
    phone_number_collection: { enabled: true },
    shipping_address_collection: { allowed_countries: ["US"] },
  }, { idempotencyKey: orderId });

  const { error: sessionIdError } = await adminSupabase.from("rx_orders").update({ stripe_session_id: session.id }).eq("id", orderId);
  if (sessionIdError) return err("Failed to store session", 500);

  if (tbybSub) {
    if (session.id !== tbybSub.open_stripe_session_id) {
      if (tbybSub.open_stripe_session_id) {
        try {
          await stripe.checkout.sessions.expire(tbybSub.open_stripe_session_id);
        } catch (e: any) {
          if (e?.type === "invalid_request_error") {
            const existing = await stripe.checkout.sessions.retrieve(tbybSub.open_stripe_session_id);
            if (existing.status === "complete") {
              return err("Previous session already completed — please retry shortly", 500);
            }
          } else {
            return err("Failed to expire existing session", 500);
          }
        }

        const { error: deleteOrderError } = await adminSupabase.from("rx_orders").delete().eq("stripe_session_id", tbybSub.open_stripe_session_id).eq("status", "Unpaid");
        if (deleteOrderError) return err("Failed to delete expired order", 500);

        const { error: nullError } = await adminSupabase
          .from("tbyb_submissions")
          .update({ open_stripe_session_id: null })
          .eq("id", tbybSub.id);

        if (nullError) return err("Failed to clear session", 500);
      }

      const { data: claimed, error: claimError } = await adminSupabase
        .from("tbyb_submissions")
        .update({ open_stripe_session_id: session.id })
        .eq("id", tbybSub.id)
        .is("open_stripe_session_id", null)
        .select("id");

      if (claimError) return err("Failed to claim session", 500);
      if (claimed.length === 0) {
        return err("Session conflict, please retry", 409);
      }
    }
  }

  if (!session.url) return err("Failed to create checkout session", 500);

  return ok({ url: session.url });
}
