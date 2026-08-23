import { NextRequest } from "next/server";
import { createUserClient } from "@/lib/supabase/user";
import { ok, err } from "@/lib/api";

export async function POST(req: NextRequest) {
  const client = await createUserClient(req);
  if (!client) return err("Unauthorized", 401);

  const body = await req.json();

  const brandSlug = body.brandSlug;
  if (!brandSlug) return err("brandSlug is required", 400);

  const { supabase } = client;

  const { data, error } = await supabase
    .from("cart_items")
    .select("product_id, product_slug, sku, attribute, name, image_src, price_cents, quantity")
    .eq("brand_slug", brandSlug);

  if (error) return err("Failed to fetch cart", 500);

  const items = (data ?? []).map((row) => ({
    productId: row.product_id,
    productSlug: row.product_slug,
    sku: row.sku,
    attribute: row.attribute ?? [],
    name: row.name,
    imageSrc: row.image_src,
    priceCents: row.price_cents,
    quantity: row.quantity,
  }));

  return ok(items);
}

export async function PUT(req: NextRequest) {
  const client = await createUserClient(req);
  if (!client) return err("Unauthorized", 401);

  const body = await req.json();

  const brandSlug = body.brandSlug;
  if (!brandSlug) return err("brandSlug is required", 400);

  const items = body.items;
  if (!Array.isArray(items)) return err("items must be an array", 400);

  const { supabase, user } = client;

  const { error: deleteError } = await supabase
    .from("cart_items")
    .delete()
    .eq("brand_slug", brandSlug);

  if (deleteError) return err("Failed to sync cart", 500);

  if (items.length > 0) {
    const rows = items.map((item: {
      productId: string;
      productSlug: string;
      sku: string;
      attribute: { name: string; option: string; slug: string }[];
      name: string;
      imageSrc: string;
      priceCents: number;
      quantity: number;
    }) => ({
      user_id: user.id,
      brand_slug: brandSlug,
      product_id: item.productId,
      product_slug: item.productSlug,
      sku: item.sku,
      attribute: item.attribute,
      name: item.name,
      image_src: item.imageSrc,
      price_cents: item.priceCents,
      quantity: item.quantity,
    }));

    const { error: insertError } = await supabase.from("cart_items").insert(rows);
    if (insertError) return err("Failed to sync cart", 500);
  }

  const result = { synced: items.length };
  return ok(result);
}
