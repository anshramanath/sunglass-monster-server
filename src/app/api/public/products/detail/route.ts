import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ok, err } from "@/lib/api";

const PRODUCT_FIELDS = "id,brand_id,name,slug,sku,description,summary,attributes,sale,min_price_cents,max_price_cents,sale_price_cents,stock,weight,weight_unit,length,width,height,dimension_unit" as const;

const VARIATION_FIELDS = "id,product_id,slug,sku,attribute,description,sale,regular_price_cents,sale_price_cents,stock,weight,weight_unit,length,width,height,dimension_unit" as const;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.brandSlug || !body?.productId)
    return err("brandSlug and productId are required");

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
    .eq("id", body.productId)
    .eq("brand_id", brand.id)
    .single();

  if (productError || !product) return err("Product not found", 404);

  const [
    { data: variations },
    { data: productCats },
    { data: productImages },
    { data: descriptionImages },
  ] = await Promise.all([
    supabase.from("variations").select(VARIATION_FIELDS).eq("product_id", product.id).order("sku", { ascending: true }),
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

  type VarImage = { id: string; variation_id: string; src: string; name: string; sort_order: number };
  const typedVariationImages = (variationImages ?? []) as VarImage[];
  const imagesByVariationId: Record<string, VarImage[]> = {};
  for (const image of typedVariationImages) {
    imagesByVariationId[image.variation_id] ??= [];
    imagesByVariationId[image.variation_id].push(image);
  }

  const mapImage = (img: { id: string; src: string; name: string; sort_order: number }) => ({
    id: img.id,
    src: img.src,
    name: img.name,
    sortOrder: img.sort_order,
  });

  type AttrTerm = { name: string; slug: string };
  type AttrDef  = { name: string; terms: AttrTerm[] };
  const attrDefs = Array.isArray(product.attributes)
    ? (product.attributes as unknown as AttrDef[])
    : [];

  const mappedVariations = (variations ?? []).map((v) => ({
    id: v.id,
    productId: v.product_id,
    slug: v.slug,
    sku: v.sku,
    attributes: v.attribute.map((slug: string, index: number) => {
      const def = attrDefs[index];
      if (!def) return { name: slug, value: slug };
      const term = def.terms?.find((t: AttrTerm) => t.slug === slug);
      const name = def.name.charAt(0).toUpperCase() + def.name.slice(1);
      return { name, value: term?.name ?? slug };
    }),
    description: v.description,
    sale: v.sale,
    regularPriceCents: v.regular_price_cents,
    salePriceCents: v.sale_price_cents,
    stock: v.stock,
    weight: v.weight,
    weightUnit: v.weight_unit,
    length: v.length,
    width: v.width,
    height: v.height,
    dimensionUnit: v.dimension_unit,
    images: (imagesByVariationId[v.id] ?? []).map((img) => ({
      id: img.id,
      variationId: img.variation_id,
      src: img.src,
      name: img.name,
      sortOrder: img.sort_order,
    })),
  }));

  type RawCategory = { id: string; name: string; slug: string; parent_id: string | null };
  const categories = (productCats ?? [])
    .map((r) => r.categories as unknown as RawCategory | null)
    .filter((c): c is RawCategory => c !== null)
    .map((c) => ({ id: c.id, name: c.name, slug: c.slug, parentId: c.parent_id }));

  return ok({
    product: {
      id: product.id,
      brandId: product.brand_id,
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      description: product.description,
      summary: product.summary,
      sale: product.sale,
      minPriceCents: product.min_price_cents,
      maxPriceCents: product.max_price_cents,
      salePriceCents: product.sale_price_cents,
      stock: product.stock,
      weight: product.weight,
      weightUnit: product.weight_unit,
      length: product.length,
      width: product.width,
      height: product.height,
      dimensionUnit: product.dimension_unit,
    },
    variations: mappedVariations,
    categories,
    productImages: (productImages ?? []).map(mapImage),
    descriptionImages: (descriptionImages ?? []).map(mapImage),
  });
}
