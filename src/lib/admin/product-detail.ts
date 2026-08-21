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

  const { brandSlug, productId, isNew, variations } = input;
  const isSimple = variations.length === 0;
  const slug = slugify(input.name.trim());

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
    const effectivePrices = variations.map((v) => v.sale ? v.salePriceCents! : v.regularPriceCents);
    minPrice = Math.min(...effectivePrices);
    maxPrice = Math.max(...effectivePrices);
    sale = variations.some((v) => v.sale);
    salePriceCents = null;
  }

  const productRow = {
    id: productId,
    brand_slug: brandSlug,
    name: input.name,
    slug,
    sku: input.sku,
    description: input.description,
    summary: input.summary,
    attributes: isSimple ? [] : deriveAttributes(variations),
    featured: input.featured,
    sale,
    min_price_cents: minPrice,
    max_price_cents: maxPrice,
    sale_price_cents: salePriceCents,
  };

  if (isNew) {
    const { error } = await supabase.from("products").insert({ ...productRow, total_sales: isSimple ? 0 : null });
    if (error) throw new Error(error.message);
  } else {
    const { id: _, ...fields } = productRow;
    const updateFields = isSimple ? fields : { ...fields, total_sales: null };
    const { error } = await supabase.from("products").update(updateFields).eq("id", productId).eq("brand_slug", brandSlug);
    if (error) throw new Error(error.message);
  }

  // Categories: replace all
  await supabase.from("product_categories").delete().eq("product_id", productId);
  if (input.categoryIds.length > 0) {
    const { error } = await supabase.from("product_categories").insert(
      input.categoryIds.map((cid) => ({ product_id: productId, category_id: cid }))
    );
    if (error) throw new Error(error.message);
  }

  // Product images: replace all
  await supabase.from("product_images").delete().eq("product_id", productId);
  const { error: imgError } = await supabase.from("product_images").insert(
    input.images.map((img) => ({
      product_id: productId,
      src: img.src,
      name: img.name,
      sort_order: img.sortOrder,
    }))
  );
  if (imgError) throw new Error(imgError.message);

  // Description images: upsert into shared table, replace junction
  await supabase.from("product_description_images").delete().eq("product_id", productId);
  for (const img of input.descriptionImages) {
    const { data: descImg, error: descErr } = await supabase
      .from("description_images")
      .upsert({ brand_slug: brandSlug, src: img.src, name: img.name }, { onConflict: "brand_slug,src" })
      .select("id")
      .single();
    if (descErr) throw new Error(descErr.message);
    const { error: linkErr } = await supabase
      .from("product_description_images")
      .insert({ product_id: productId, image_id: descImg.id });
    if (linkErr) throw new Error(linkErr.message);
  }

  if (isSimple) {
    if (!isNew) {
      const { data: deletedVars, error: deleteVarsError } = await supabase.from("variations").delete().eq("product_id", productId).select("id");
      if (deleteVarsError) throw new Error(deleteVarsError.message);
      if (deletedVars.length > 0) {
        const { error } = await supabase.from("products").update({ total_sales: 0 }).eq("id", productId);
        if (error) throw new Error(error.message);
      }
    }
    return;
  }

  // Delete removed variations (preserve total_sales on kept ones)
  const keptIds = variations.filter((v) => !v.id.startsWith("new-")).map((v) => v.id);
  const { data: dbVars } = await supabase.from("variations").select("id").eq("product_id", productId);
  const toDelete = (dbVars ?? []).filter((v) => !keptIds.includes(v.id)).map((v) => v.id);
  if (toDelete.length > 0) {
    await supabase.from("variations").delete().in("id", toDelete);
  }

  for (const v of variations) {
    const varRow = {
      product_id: productId,
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
    };

    if (v.id.startsWith("new-")) {
      const { error } = await supabase.from("variations").insert({ ...varRow, total_sales: 0 });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("variations").update(varRow).eq("id", v.id);
      if (error) throw new Error(error.message);
    }
  }

  // Variation images: replace all, looked up by SKU
  const { data: savedVars } = await supabase.from("variations").select("id, sku").eq("product_id", productId);
  const varIdBySku: Record<string, string> = Object.fromEntries((savedVars ?? []).map((v) => [v.sku, v.id]));
  const allVarIds = (savedVars ?? []).map((v) => v.id);

  if (allVarIds.length > 0) {
    await supabase.from("variation_images").delete().in("variation_id", allVarIds);
  }

  for (const v of variations) {
    const varId = varIdBySku[v.sku];
    if (!varId || v.images.length === 0) continue;
    const { error } = await supabase.from("variation_images").insert(
      v.images.map((img) => ({
        variation_id: varId,
        src: img.src,
        name: img.name,
        sort_order: img.sortOrder,
      }))
    );
    if (error) throw new Error(error.message);
  }
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
