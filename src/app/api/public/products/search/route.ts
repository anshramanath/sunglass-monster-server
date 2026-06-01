import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ok, err } from "@/lib/api";

type CategoryRow = { id: string; parent_id: string | null };

function getDescendantCategoryIds(rootId: string, categories: CategoryRow[]): string[] {
  const result = new Set<string>([rootId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const cat of categories) {
      if (cat.parent_id && result.has(cat.parent_id) && !result.has(cat.id)) {
        result.add(cat.id);
        changed = true;
      }
    }
  }
  return Array.from(result);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.brandSlug) return err("brandSlug is required");

  const {
    brandSlug,
    categoryId,
    saleOnly = false,
    inStockOnly = false,
    sort = "name_asc",
  } = body;

  const cleanSearch = String(body.search ?? "")
    .trim()
    .replace(/[,%()]/g, "");

  const page = Math.max(1, Number(body.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(body.limit) || 24));

  const supabase = createAdminClient();

  const { data: brand, error: brandError } = await supabase
    .from("brands")
    .select("id")
    .eq("slug", brandSlug)
    .single();

  if (brandError || !brand) return err("Brand not found", 404);

  // Resolve category filter to product IDs, expanding through all descendants
  let productIdFilter: string[] | null = null;
  if (categoryId) {
    const { data: category, error: categoryError } = await supabase
      .from("categories")
      .select("id")
      .eq("id", categoryId)
      .eq("brand_id", brand.id)
      .single();

    if (categoryError || !category) return err("Category not found", 404);

    const { data: allCategories } = await supabase
      .from("categories")
      .select("id, parent_id")
      .eq("brand_id", brand.id);

    const categoryIds = getDescendantCategoryIds(category.id, allCategories ?? []);

    const { data: productCats } = await supabase
      .from("product_categories")
      .select("product_id")
      .in("category_id", categoryIds);

    productIdFilter = [...new Set(productCats?.map((r) => r.product_id) ?? [])];

    if (productIdFilter.length === 0) {
      return ok({
        products: [],
        page,
        limit,
        totalPages: 0,
        totalProducts: 0,
        hasNextPage: false,
        hasPreviousPage: page > 1,
        filters: { brandSlug, categoryId, search: cleanSearch || null, saleOnly, inStockOnly, sort },
      });
    }
  }

  let query = supabase
    .from("products")
    .select("id, name, slug, min_price_cents, max_price_cents, sale_price_cents, sale, stock", {
      count: "exact",
    })
    .eq("brand_id", brand.id);

  if (productIdFilter !== null) query = query.in("id", productIdFilter);
  if (cleanSearch) query = query.or(`name.ilike.%${cleanSearch}%,sku.ilike.%${cleanSearch}%`);
  if (saleOnly) query = query.eq("sale", true);
  if (inStockOnly) query = query.gt("stock", 0);

  if (sort === "price_asc")
    query = query.order("min_price_cents", { ascending: true });
  else if (sort === "price_desc")
    query = query.order("min_price_cents", { ascending: false });
  else if (sort === "name_desc")
    query = query.order("name", { ascending: false });
  else
    query = query.order("name", { ascending: true });

  const offset = (page - 1) * limit;
  query = query.range(offset, offset + limit - 1);

  const { data: products, count, error } = await query;
  if (error) return err("Failed to fetch products");

  // Batch-fetch one thumbnail per product
  const ids = products?.map((p) => p.id) ?? [];
  const { data: images } =
    ids.length > 0
      ? await supabase
          .from("product_images")
          .select("product_id, src")
          .in("product_id", ids)
          .order("sort_order", { ascending: true })
      : { data: [] };

  const thumbnailMap: Record<string, string> = {};
  for (const img of images ?? []) {
    if (!thumbnailMap[img.product_id]) thumbnailMap[img.product_id] = img.src;
  }

  const totalProducts = count ?? 0;

  const totalPages = Math.ceil(totalProducts / limit);

  return ok({
    products: (products ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      minPriceCents: p.min_price_cents,
      maxPriceCents: p.max_price_cents,
      salePriceCents: p.sale_price_cents,
      sale: p.sale,
      stock: p.stock,
      thumbnail: thumbnailMap[p.id] ?? null,
    })),
    page,
    limit,
    totalPages,
    totalProducts,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
    filters: {
      brandSlug,
      categoryId: categoryId ?? null,
      search: cleanSearch || null,
      saleOnly,
      inStockOnly,
      sort,
    },
  });
}
