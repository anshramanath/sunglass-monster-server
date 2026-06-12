import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ok, err } from "@/lib/api";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const brandSlug = params.get("brandSlug");
  const categoryId = params.get("categoryId");
  if (!brandSlug) return err("Brand slug is required!", 400);
  if (!categoryId) return err("Category id is required!", 400);

  const page = Math.max(1, Number(params.get("page")) || 1);
  const size = Math.min(100, Math.max(1, Number(params.get("size")) || 24));

  const supabase = createAdminClient();

  const { data: brand, error: brandError } = await supabase
    .from("brands")
    .select("id")
    .eq("slug", brandSlug)
    .single();

  if (brandError || !brand) return err("Brand not found!", 404);

  const from = (page - 1) * size;
  const to = from + size - 1;
  const { data: products, count: total, error } = await supabase
    .from("products")
    .select("id, name, slug, attributes, featured, sale, min_price_cents, max_price_cents, sale_price_cents, product_categories!inner(category_id), product_images!inner(src, name, sort_order)", { count: "exact" })
    .eq("brand_id", brand.id)
    .eq("product_categories.category_id", categoryId)
    .eq("in_stock", true)
    .order("name", { ascending: true })
    .range(from, to);

  if (error) return err("Failed to fetch products!", 500);

  const totalProducts = total ?? 0;
  const totalPages = Math.ceil(totalProducts / size);

  const mapped = (products ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    minPriceCents: p.min_price_cents,
    maxPriceCents: p.max_price_cents,
    salePriceCents: p.sale_price_cents,
    attributes: p.attributes,
    featured: p.featured,
    sale: p.sale,
    images: p.product_images
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((img) => ({ src: img.src, name: img.name })),
  }));

  return ok({
    products: mapped,
    page,
    size,
    totalPages,
    totalProducts,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  }, 200);
}
