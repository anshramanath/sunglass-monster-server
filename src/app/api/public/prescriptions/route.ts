import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ok, err } from "@/lib/api";

export async function GET(req: NextRequest) {
  const brandSlug = req.nextUrl.searchParams.get("brandSlug");
  if (!brandSlug) return err("brandSlug is required", 400);

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("prescription_frames")
    .select("id, name, slug, image_src, price_cents, size, rx_low, rx_high, colors")
    .eq("brand_slug", brandSlug)
    .order("name");

  if (error) return err(error.message, 500);

  const frames = (data ?? []).map((f) => ({
    id: f.id,
    name: f.name,
    slug: f.slug,
    imageSrc: f.image_src,
    priceCents: f.price_cents,
    size: f.size,
    rxLow: Number(f.rx_low),
    rxHigh: Number(f.rx_high),
    colors: f.colors,
  }));

  return ok(frames);
}
