import { createAdminClient } from "@/lib/supabase/admin";
import { getBrandBySlug } from "@/lib/brand";

function veeqo(path: string, options?: RequestInit) {
  return fetch(`https://api.veeqo.com${path}`, {
    ...options,
    headers: {
      "x-api-key": process.env.VEEQO_SECRET_KEY!,
      "Content-Type": "application/json",
    },
  });
}

async function resolveChannel(): Promise<number> {
  const channel = process.env.VEEQO_CHANNEL_NAME!;

  const res = await veeqo("/channels");

  if (!res.ok) throw "Sales channel not found or inactive";

  const all: any[] = await res.json();

  const matches = all.filter(
    (c) => c.name === channel && c.type_code === "direct" && c.state === "active"
  );

  if (matches.length === 0) throw "Sales channel not found or inactive";
  if (matches.length > 1) throw "Multiple active sales channels matched";

  return matches[0].id as number;
}

async function resolveDeliveryMethod(): Promise<number> {
  const delivery = process.env.VEEQO_DELIVERY_METHOD_NAME!;

  const res = await veeqo("/delivery_methods");

  if (!res.ok) throw "Delivery method not found";

  const all: any[] = await res.json();

  const matches = all.filter((m) => m.name === delivery);

  if (matches.length === 0) throw "Delivery method not found";
  if (matches.length > 1) throw "Multiple delivery methods matched";

  return matches[0].id as number;
}

async function resolveSku(sku: string): Promise<number> {
  const res = await veeqo(`/products?query=${encodeURIComponent(sku)}`);

  if (!res.ok) throw `SKU not found in Veeqo: ${sku}`;

  const products: any[] = await res.json();
  
  const matches: number[] = [];

  for (const product of products) {
    for (const sellable of product.sellables ?? []) {
      if (sellable.sku_code === sku) {
        matches.push(sellable.id);
      }
    }
  }
  
  if (matches.length === 0) throw `SKU not found in Veeqo: ${sku}`;
  if (matches.length > 1) throw `Multiple Veeqo products matched SKU: ${sku}`;

  return matches[0];
}

function splitName(name: string | null): { first_name: string | null; last_name: string | null } {
  if (!name) return { first_name: null, last_name: null };
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return { first_name: parts[0], last_name: null };
  return { first_name: parts.slice(0, -1).join(" "), last_name: parts[parts.length - 1] };
}

type Address = {
  line1: string | null | undefined;
  line2: string | null | undefined;
  city: string | null | undefined;
  state: string | null | undefined;
  postal_code: string | null | undefined;
  country: string | null | undefined;
};

type CustomerInfo = {
  email: string | null;
  phone: string | null;
  billing: {
    name: string | null;
    address: Address;
  };
  name: string | null;
  address: Address;
};

export async function syncOrderToVeeqo(
  orderId: string,
  brandSlug: string,
  items: { sku: string; qty: number; priceCents: number }[],
  customer: CustomerInfo,
  paymentIntent: string,
): Promise<void> {
  const supabase = createAdminClient();

  // Atomic claim — only one concurrent invocation proceeds
  const { data: claimed, error: claimError } = await supabase
    .from("orders")
    .update({ veeqo_error: "Sync in progress" })
    .eq("id", orderId)
    .is("veeqo_order_id", null)
    .is("veeqo_error", null)
    .select("id")
    .maybeSingle();

  if (claimError) console.error("Veeqo sync claim DB error", claimError);
  if (claimError || !claimed) return;

  let veeqoOrderId: string | null = null;
  let veeqoError: string | null = null;

  const brandName = getBrandBySlug(brandSlug)?.name ?? brandSlug;
  const orderNumber = `${brandName} - #${orderId.slice(-8).toUpperCase()}`;

  try {
    if (!customer.phone) throw "Missing shipping phone number";

    const [channelId, deliveryMethodId] = await Promise.all([
      resolveChannel(),
      resolveDeliveryMethod(),
    ]);

    const lineItems = await Promise.all(
      items.map(async (item) => ({
        sellable_id: await resolveSku(item.sku),
        quantity: item.qty,
        price_per_unit: (item.priceCents / 100).toFixed(2),
      }))
    );

    const res = await veeqo("/orders", {
      method: "POST",
      body: JSON.stringify({
        order: {
          channel_id: channelId,
          delivery_method_id: deliveryMethodId,
          number: orderNumber,
          delivery_cost: "0.00",
          customer_attributes: {
            email: customer.email,
            phone: customer.phone,
            billing_address_attributes: {
              ...splitName(customer.billing.name),
              address1: customer.billing.address!.line1,
              ...(customer.billing.address!.line2 ? { address2: customer.billing.address!.line2 } : {}),
              city: customer.billing.address!.city,
              state: customer.billing.address!.state,
              zip: customer.billing.address!.postal_code,
              country: customer.billing.address!.country,
            },
          },
          deliver_to_attributes: {
            ...splitName(customer.name),
            address1: customer.address.line1,
            ...(customer.address.line2 ? { address2: customer.address.line2 } : {}),
            city: customer.address.city,
            state: customer.address.state,
            zip: customer.address.postal_code,
            country: customer.address.country,
            email: customer.email,
            phone: customer.phone,
          },
          line_items_attributes: lineItems,
          payment_attributes: {
            payment_type: "Stripe",
            reference_number: paymentIntent,
          },
        },
      }),
    });

    if (!res.ok) throw "Veeqo order creation failed";
    
    const data = await res.json();
    veeqoOrderId = String(data.id);
  } catch (e) {
    veeqoError = typeof e === "string" ? e : "Veeqo order creation failed";
  }

  const { error: finalError } = await supabase
    .from("orders")
    .update({ veeqo_order_id: veeqoOrderId, veeqo_error: veeqoError })
    .eq("id", orderId);

  if (finalError) {
    console.error("Failed to save Veeqo sync result", finalError);
  }
}
