import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ok, err } from "@/lib/api";

export async function GET(req: NextRequest) {
  const productId = req.nextUrl.searchParams.get("productId");
  if (!productId) return err("Product id is required!", 400);

  const supabase = createAdminClient();

  const { data: product, error } = await supabase
    .from("products")
    .select(`
      id, name, sku, description, summary, attributes, featured,
      sale, min_price_cents, max_price_cents, sale_price_cents, stock,
      variations(id, sku, attribute, sale, regular_price_cents, sale_price_cents, stock,
        variation_images(src, name, sort_order)
      ),
      product_images(src, name, sort_order),
      product_description_images(
        description_images(src, name)
      )
    `)
    .eq("id", productId)
    .single();

  if (error || !product) return err("Product not found!", 404);

  const variations = (product.variations ?? []).map((v) => ({
    id: v.id,
    sku: v.sku,
    attribute: v.attribute,
    sale: v.sale,
    regularPriceCents: v.regular_price_cents,
    salePriceCents: v.sale_price_cents,
    stock: v.stock,

    images: (v.variation_images ?? []).map((img) => ({ src: img.src, name: img.name, sortOrder: img.sort_order })),
  }));

  const productImages = (product.product_images ?? []).map((img) => ({ src: img.src, name: img.name, sortOrder: img.sort_order }));

  const descriptionImages = (product.product_description_images ?? [])
    .flatMap((r) => r.description_images);

  return ok({
    id: product.id,
    name: product.name,
    sku: product.sku,
    description: product.description,
    summary: product.summary,
    attributes: product.attributes,
    featured: product.featured,
    sale: product.sale,
    minPriceCents: product.min_price_cents,
    maxPriceCents: product.max_price_cents,
    salePriceCents: product.sale_price_cents,
    stock: product.stock,
    variations,
    productImages,
    descriptionImages,
  }, 200);
}
