import { NextRequest } from "next/server";
import crypto from "crypto";
import { createUserClient } from "@/lib/supabase/user";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";
import { ok, err } from "@/lib/api";

type CartItem = {
  productSlug: string;
  sku: string;
  priceCents: number;
  quantity: number;
};

type Entry = {
  priceCents: number;
  name: string;
  attribute: { name: string; option: string }[];
  imageSrc: string;
};

function hashCart(items: CartItem[], entryMap: Map<string, Entry>) {
  const sorted = [...items]
    .sort((a, b) => a.sku.localeCompare(b.sku))
    .map((i) => {
      const entry = entryMap.get(`${i.productSlug}:${i.sku}`)!;
      return {
        productSlug: i.productSlug,
        sku: i.sku,
        quantity: i.quantity,
        name: entry.name,
        priceCents: entry.priceCents,
        attribute: entry.attribute,
        imageSrc: entry.imageSrc,
      };
    });

  return crypto.createHash("sha256").update(JSON.stringify(sorted)).digest("hex");
}

export async function POST(req: NextRequest) {
  const client = await createUserClient(req);
  if (!client) return err("Unauthorized", 401);

  const body = await req.json();

  const brandSlug = body.brandSlug;
  if (!brandSlug) return err("brandSlug is required", 400);

  const items = body.items;
  if (!Array.isArray(items) || items.length === 0) return err("items must be a non-empty array", 400);

  const { successUrl, cancelUrl } = body;
  if (!successUrl || !cancelUrl) return err("successUrl and cancelUrl are required", 400);

  const slugs = (items as CartItem[]).map((i) => i.productSlug);

  const adminSupabase = createAdminClient();

  const { data: productRows } = await adminSupabase
    .from("products")
    .select(`
      slug, name, sku, sale, min_price_cents, sale_price_cents,
      product_images(src, sort_order),
      variations(sku, sale, regular_price_cents, sale_price_cents, attribute,
        variation_images(src, sort_order)
      )
    `)
    .eq("brand_slug", brandSlug)
    .in("slug", slugs);

  const entryMap = new Map<string, Entry>();
  for (const p of productRows ?? []) {
    const productImage = (p.product_images as { src: string; sort_order: number }[])
      .sort((a, b) => a.sort_order - b.sort_order)[0].src;

    if (p.sku) {
      entryMap.set(`${p.slug}:${p.sku}`, {
        priceCents: p.sale ? p.sale_price_cents : p.min_price_cents,
        name: p.name,
        attribute: [],
        imageSrc: productImage,
      });
    }

    for (const v of p.variations ?? []) {
      const variationImage = (v.variation_images as { src: string; sort_order: number }[])
        .sort((a, b) => a.sort_order - b.sort_order)[0]?.src;

      entryMap.set(`${p.slug}:${v.sku}`, {
        priceCents: v.sale ? v.sale_price_cents : v.regular_price_cents,
        name: p.name,
        attribute: v.attribute as { name: string; option: string }[],
        imageSrc: variationImage ?? productImage,
      });
    }
  }

  const validation = (items as CartItem[]).map((item) => {
    const entry = entryMap.get(`${item.productSlug}:${item.sku}`) ?? null;
    return {
      productSlug: item.productSlug,
      sku: item.sku,
      exists: entry !== null,
      priceCents: entry?.priceCents ?? null,
      priceChanged: entry !== null && entry.priceCents !== item.priceCents,
    };
  });

  const hasInvalid = validation.some((v) => !v.exists);
  const hasChangedPrice = validation.some((v) => v.priceChanged);

  if (hasInvalid || hasChangedPrice) {
    const status = hasInvalid && hasChangedPrice ? 422 : hasInvalid ? 404 : 409;
    return err("Cart validation failed", status, validation);
  }

  const { supabase: userSupabase, user } = client;

  const { count } = await userSupabase
    .from("orders")
    .select("*", { count: "exact", head: true });

  const orderCount = count ?? 0;
  const idempotencyKey = `${user.id}:${hashCart(items, entryMap)}:${orderCount}`;

  let session;
  try {
    session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        client_reference_id: user.id,
        customer_email: user.email,
        metadata: { type: "order", brandSlug },
        line_items: (items as CartItem[]).map((item) => {
          const entry = entryMap.get(`${item.productSlug}:${item.sku}`)!;
          return {
            price_data: {
              currency: "usd",
              product_data: {
                name: entry.attribute.length > 0 ? `${entry.name} — ${entry.attribute.map((a) => a.option).join(" / ")}` : entry.name,
                description: item.sku,
                images: [entry.imageSrc],
              },
              unit_amount: entry.priceCents,
            },
            quantity: item.quantity,
          };
        }),
        shipping_address_collection: { allowed_countries: ["US"] },
        billing_address_collection: "required",
        phone_number_collection: { enabled: true },
        success_url: successUrl,
        cancel_url: cancelUrl,
      },
      { idempotencyKey }
    );
  } catch {
    return err("Failed to create checkout session", 500);
  }

  if (!session.url) return err("Failed to create checkout session", 500);
  const sessionUrl = { url: session.url };
  return ok(sessionUrl);
}
