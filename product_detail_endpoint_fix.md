# Product Detail Endpoint Fix

## Issue

The current product detail endpoint looks up products using:

```ts
.eq("slug", body.productSlug)
.eq("brand_id", brand.id)
.single();
```

This assumes product slugs are unique within a brand.

However, in Sunglass Monster:

```txt
Product ID = source of truth
SKU = globally unique
Slug = display helper only
```

Product slugs are not guaranteed to be unique.

This means:

```txt
Two products may share the same slug.
```

When that happens:

```ts
.single()
```

will fail because multiple rows match.

---

# Recommended Fix

Switch the endpoint from:

```json
{
  "brandSlug": "bikershades",
  "productSlug": "gravity"
}
```

to:

```json
{
  "brandSlug": "bikershades",
  "productId": "uuid"
}
```

The frontend should always use the product ID returned by product search.

---

# Request Schema

## Old

```json
{
  "brandSlug": "bikershades",
  "productSlug": "gravity"
}
```

## New

```json
{
  "brandSlug": "bikershades",
  "productId": "5c7d2c89-..."
}
```

---

# Validation

Replace:

```ts
if (!body?.brandSlug || !body?.productSlug)
  return err("brandSlug and productSlug are required");
```

with:

```ts
if (!body?.brandSlug || !body?.productId)
  return err("brandSlug and productId are required");
```

---

# Product Query

Replace:

```ts
const { data: product, error: productError } = await supabase
  .from("products")
  .select(PRODUCT_FIELDS)
  .eq("slug", body.productSlug)
  .eq("brand_id", brand.id)
  .single();
```

with:

```ts
const { data: product, error: productError } = await supabase
  .from("products")
  .select(PRODUCT_FIELDS)
  .eq("id", body.productId)
  .eq("brand_id", brand.id)
  .single();
```

---

# Frontend Flow

## Product Search Response

Already returns:

```json
{
  "id": "uuid",
  "name": "Wiley X Gravity",
  "slug": "gravity"
}
```

The frontend should store:

```ts
product.id
```

and use it when navigating.

Example:

```ts
openProduct(product.id);
```

---

# Data Model

## Name

Used for display.

```txt
Wiley X Gravity
```

---

## Slug

Used only as a helper value.

```txt
gravity
```

Not trusted for lookups.

---

## SKU

Globally unique across all products and variations.

```txt
WX-GRAVITY-001
```

Useful for inventory and admin operations.

---

## Product ID

Primary key and source of truth.

```txt
5c7d2c89-...
```

All internal product lookups should use this value.

---

# Result

Benefits:

* No ambiguity
* No duplicate slug issues
* Stable lookups
* Uses the database primary key
* Matches the overall Sunglass Monster architecture

This should be considered the canonical lookup strategy for product detail endpoints going forward.
