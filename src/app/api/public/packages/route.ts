import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ok, err } from "@/lib/api";

export async function GET(req: NextRequest) {
  const brandSlug = req.nextUrl.searchParams.get("brandSlug");
  if (!brandSlug) return err("brandSlug is required", 400);

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("tbyb_packages")
    .select("id, name, slug, price_cents, image_src, pairs_min, pairs_max, brands")
    .eq("brand_slug", brandSlug);

  if (error) return err(error.message, 500);

  const packages = (data ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    priceCents: p.price_cents,
    imageSrc: p.image_src,
    pairsMin: p.pairs_min,
    pairsMax: p.pairs_max,
    brands: p.brands as string[],
  }));

  return ok(packages);
}
