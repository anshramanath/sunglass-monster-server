import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ok, err } from "@/lib/api";

type RawAttribute = { name: string; option: string; slug: string; value?: string };
type RawImage = { src: string; name: string; sort_order: number };
type RawVariation = { id: string; attribute: RawAttribute[]; variation_images: RawImage[] };

const FILTER_MAP: Record<string, { minPrice?: number; maxPrice?: number }> = {
  "under-15": { maxPrice: 1500 },
  "15-25":    { minPrice: 1500, maxPrice: 2500 },
  "25-plus":  { minPrice: 2500 },
};

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  
  const brandSlug = params.get("brandSlug");
  if (!brandSlug) return err("brandSlug is required", 400);

  const filterSlug = params.get("filter") ?? undefined;
  const activeFilter = filterSlug ? FILTER_MAP[filterSlug] : undefined;

  const page = Math.max(1, Number(params.get("page")) || 1);
  const size = Math.min(100, Math.max(1, Number(params.get("size")) || 20));

  const from = (page - 1) * size;
  const to = from + size - 1;

  const supabase = createAdminClient();

  let q = supabase
    .from("products")
    .select(`
      id, name, slug, featured, sale, min_price_cents, max_price_cents, sale_price_cents,
      product_images!inner(src, name, sort_order),
      variations(id, attribute,
        variation_images(src, name, sort_order)
      )
    `, { count: "exact" })
    .eq("brand_slug", brandSlug)
    .eq("sale", true);

  if (activeFilter?.minPrice !== undefined) q = q.gte("min_price_cents", activeFilter.minPrice);
  if (activeFilter?.maxPrice !== undefined) q = q.lte("min_price_cents", activeFilter.maxPrice);

  const { data, count, error } = await q.order("id", { ascending: true }).range(from, to);

  if (error) return err("Failed to fetch sale products", 500);

  const totalProducts = count ?? 0;
  const totalPages = Math.ceil(totalProducts / size);

  const products = (data ?? []).map((p) => {
    const firstImage = (p.product_images as RawImage[]).sort((a, b) => a.sort_order - b.sort_order)[0];

    const seen = new Set<string>();
    const variations = (p.variations ?? []).reduce((acc: { id: string; option: string; slug: string; value?: string; imageSrc: string | null; imageName: string | null }[], v: RawVariation) => {
      const color = v.attribute.find((a) => a.name === "color");
      if (!color || seen.has(color.slug)) return acc;
      seen.add(color.slug);
      const firstImage = v.variation_images.sort((a, b) => a.sort_order - b.sort_order)[0];
      acc.push({
        id: v.id,
        option: color.option,
        slug: color.slug,
        value: color.value,
        imageSrc: firstImage?.src ?? null,
        imageName: firstImage?.name ?? null,
      });
      return acc;
    }, []);

    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      minPriceCents: p.min_price_cents,
      maxPriceCents: p.max_price_cents,
      salePriceCents: p.sale_price_cents,
      featured: p.featured,
      sale: p.sale,
      imageSrc: firstImage!.src,
      imageName: firstImage!.name,
      variations,
    };
  });

  const result = {
    products,
    page,
    size,
    totalPages,
    totalProducts,
    hasNextPage: page < totalPages,
  };
  
  return ok(result);
}
