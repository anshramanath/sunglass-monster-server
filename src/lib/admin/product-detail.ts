"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { slugify } from "@/lib/utils";
import type { ProductDetailAttribute, ProductDetailData } from "@/lib/types";

export async function getProductDetail(brandSlug: string, productId: string): Promise<ProductDetailData> {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("products")
    .select(`
      id, name, slug, sku, description, summary, featured, sale, min_price_cents, sale_price_cents,
      product_categories(category_id),
      product_images(src, name, sort_order),
      product_description_images(description_images(src, name)),
      variations(id, sku, regular_price_cents, sale_price_cents, sale, attribute,
        variation_images(src, name, sort_order)
      )
    `)
    .eq("id", productId)
    .eq("brand_slug", brandSlug)
    .single();

  if (error) throw new Error("Product not found");

  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    sku: data.sku,
    description: data.description,
    summary: data.summary as string[],
    featured: data.featured,
    sale: data.sale,
    minPriceCents: data.min_price_cents,
    salePriceCents: data.sale_price_cents,
    categoryIds: (data.product_categories as { category_id: string }[]).map((pc) => pc.category_id),
    images: (data.product_images as { src: string; name: string; sort_order: number }[])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((img) => ({ src: img.src, name: img.name, sortOrder: img.sort_order })),
    descriptionImages: (data.product_description_images as { description_images: { src: string; name: string }[] }[])
      .flatMap((r) => r.description_images),
    variations: (data.variations as any[]).map((v) => ({
      id: v.id,
      sku: v.sku,
      regularPriceCents: v.regular_price_cents,
      salePriceCents: v.sale_price_cents,
      sale: v.sale,
      attribute: v.attribute as ProductDetailAttribute[],
      images: (v.variation_images as { src: string; name: string; sort_order: number }[])
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((img) => ({ src: img.src, name: img.name, sortOrder: img.sort_order })),
    })),
  };
}

type SaveInput = {
  brandSlug: string;
  productId: string;
  isNew: boolean;
  name: string;
  sku: string | null;
  description: string;
  summary: string[];
  featured: boolean;
  sale: boolean | null;
  regularPriceCents: number | null;
  salePriceCents: number | null;
  categoryIds: string[];
  images: { src: string; name: string; sortOrder: number }[];
  descriptionImages: { src: string; name: string }[];
  variations: {
    id: string;
    sku: string;
    regularPriceCents: number;
    salePriceCents: number | null;
    sale: boolean;
    attribute: ProductDetailAttribute[];
    images: { src: string; name: string; sortOrder: number }[];
  }[];
};


function deriveAttributes(variations: SaveInput["variations"]) {
  const map = new Map<string, Map<string, { option: string; slug: string; value?: string }>>();
  for (const v of variations) {
    for (const attr of v.attribute) {
      if (!map.has(attr.name)) map.set(attr.name, new Map());
      const slug = slugify(attr.option);
      const attrMap = map.get(attr.name)!;
      if (!attrMap.has(slug)) {
        const entry: { option: string; slug: string; value?: string } = { option: attr.option, slug };
        if (attr.name === "color" && attr.value) entry.value = attr.value;
        attrMap.set(slug, entry);
      }
    }
  }
  return [...map.entries()].map(([name, opts]) => ({ name, options: [...opts.values()] }));
}

export async function saveProduct(input: SaveInput): Promise<void> {
  await requireAdmin();
  const supabase = createAdminClient();

  const { brandSlug, productId, isNew, variations, name } = input;
  const isSimple = variations.length === 0;
  const slug = slugify(name.trim());

  const { data: slugConflict, error: slugError } = await supabase
    .from("products")
    .select("id")
    .eq("brand_slug", brandSlug)
    .eq("slug", slug)
    .neq("id", productId)
    .limit(1);
  if (slugError) throw new Error("Failed to check slug uniqueness.");
  if (slugConflict.length) throw new Error("A product with this slug already exists.");

  let minPrice: number, maxPrice: number, sale: boolean, salePriceCents: number | null;
  if (isSimple) {
    minPrice = maxPrice = input.regularPriceCents!;
    sale = input.sale!;
    salePriceCents = input.salePriceCents;
  } else {
    const effectivePrices = variations.map((v) => (v.sale ? v.salePriceCents! : v.regularPriceCents));
    minPrice = Math.min(...effectivePrices);
    maxPrice = Math.max(...effectivePrices);
    sale = variations.some((v) => v.sale);
    salePriceCents = null;
  }

  const { error } = await supabase.rpc("save_product", {
    p_brand_slug: brandSlug,
    p_product_id: productId,
    p_is_new: isNew,
    p_name: name,
    p_slug: slug,
    p_sku: input.sku,
    p_description: input.description,
    p_summary: input.summary,
    p_attributes: isSimple ? [] : deriveAttributes(variations),
    p_featured: input.featured,
    p_sale: sale,
    p_min_price_cents: minPrice,
    p_max_price_cents: maxPrice,
    p_sale_price_cents: salePriceCents,
    p_is_simple: isSimple,
    p_category_ids: input.categoryIds,
    p_images: input.images.map((img) => ({ src: img.src, name: img.name, sort_order: img.sortOrder })),
    p_description_images: input.descriptionImages,
    p_variations: variations.map((v) => ({
      id: v.id.startsWith("new-") ? null : v.id,
      sku: v.sku,
      attribute: v.attribute.map((a) => ({
        name: a.name,
        option: a.option,
        slug: slugify(a.option),
        ...(a.value ? { value: a.value } : {}),
      })),
      sale: v.sale,
      regular_price_cents: v.regularPriceCents,
      sale_price_cents: v.salePriceCents,
      images: v.images.map((img) => ({ src: img.src, name: img.name, sort_order: img.sortOrder })),
    })),
  });
  if (error) throw new Error(error.message);
}

export async function deleteProduct(brandSlug: string, productId: string): Promise<void> {
  await requireAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase.from("products").delete().eq("id", productId).eq("brand_slug", brandSlug);
  if (error) throw new Error(error.message);
}

export async function uploadImage(formData: FormData): Promise<string> {
  await requireAdmin();
  const supabase = createAdminClient();

  const file = formData.get("file") as File;
  const path = formData.get("path") as string;
  const bucket = formData.get("bucket") as string;

  const { data, error } = await supabase.storage.from(bucket).upload(path, file);
  if (error) throw new Error(error.message);

  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(data.path);
  return publicUrl;
}
