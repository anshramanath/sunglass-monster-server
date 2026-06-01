import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ok, err } from "@/lib/api";

const PRODUCT_FIELDS = "id,brand_id,name,slug,sku,description,summary,attributes,sale,min_price_cents,max_price_cents,sale_price_cents,stock,weight,weight_unit,length,width,height,dimension_unit" as const;

const VARIATION_FIELDS = "id,product_id,slug,sku,attribute,description,sale,regular_price_cents,sale_price_cents,stock,weight,weight_unit,length,width,height,dimension_unit" as const;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.brandSlug || !body?.productSlug)
    return err("brandSlug and productSlug are required");

  const supabase = createAdminClient();

  const { data: brand, error: brandError } = await supabase
    .from("brands")
    .select("id")
    .eq("slug", body.brandSlug)
    .single();

  if (brandError || !brand) return err("Brand not found", 404);

  const { data: product, error: productError } = await supabase
    .from("products")
    .select(PRODUCT_FIELDS)
    .eq("slug", body.productSlug)
    .eq("brand_id", brand.id)
    .single();

  if (productError || !product) return err("Product not found", 404);

  const [
    { data: variations },
    { data: productCats },
    { data: productImages },
    { data: descriptionImages },
  ] = await Promise.all([
    supabase.from("variations").select(VARIATION_FIELDS).eq("product_id", product.id),
    supabase
      .from("product_categories")
      .select("categories(id, name, slug, parent_id)")
      .eq("product_id", product.id),
    supabase
      .from("product_images")
      .select("id, src, name, sort_order")
      .eq("product_id", product.id)
      .order("sort_order"),
    supabase
      .from("description_images")
      .select("id, src, name, sort_order")
      .eq("product_id", product.id)
      .order("sort_order"),
  ]);

  const variationIds = variations?.map((v) => v.id) ?? [];
  const { data: variationImages } =
    variationIds.length > 0
      ? await supabase
          .from("variation_images")
          .select("id, variation_id, src, name, sort_order")
          .in("variation_id", variationIds)
          .order("sort_order", { ascending: true })
      : { data: [] };

  const categories = productCats?.map((r) => r.categories).filter(Boolean) ?? [];

  return ok({
    product,
    variations: variations ?? [],
    variationImages: variationImages ?? [],
    categories,
    productImages: productImages ?? [],
    descriptionImages: descriptionImages ?? [],
  });
}
