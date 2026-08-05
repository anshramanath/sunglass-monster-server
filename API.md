# API Reference

All endpoints return:
```json
{ "success": true,  "data": { ... } }
{ "success": false, "message": "Error description" }
{ "success": false, "message": "Error description", "data": { ... } }
```

The third shape is only used by `/validate-cart` and `/checkout` on 404/409/422 — `data` contains the per-item validation array.

**Status codes**
| Status | Meaning |
|--------|---------|
| `2xx` | Success |
| `400` | Bad request — missing or invalid params |
| `401` | Unauthorized — missing or invalid token |
| `404` | Resource not found |
| `409` | Conflict — e.g. price changed |
| `422` | Unprocessable — multiple validation failures |
| `500` | Server error — DB or internal failure |

Network failures never reach the server. Handle them client-side.

An incorrect `brandSlug` is not an error — list endpoints return an empty array with `200`. Only `/api/public/item` returns `404` for a missing slug because it uses `.single()` which treats zero rows as an error.

Authenticated endpoints require `Authorization: Bearer <supabase_access_token>`.

---

## Public Endpoints

### GET /api/public/brands

Returns all brands.

**Errors:** `500` DB failure

**Response `200`**
```json
[
  { "name": "BikerShades", "slug": "bikershades" }
]
```

---

### GET /api/public/categories

Returns the full category tree for a brand, sorted by `sortOrder` at every level.

**Query Params**
| Param | Required | Description |
|-------|----------|-------------|
| brandSlug | yes | Brand slug |

**Errors:** `400` missing brandSlug · `500` DB failure

**Response `200`**
```json
[
  {
    "id": "uuid",
    "name": "Sunglasses",
    "slug": "sunglasses",
    "sortOrder": 1,
    "children": [
      { "id": "uuid", "name": "Sport", "slug": "sport", "sortOrder": 1 }
    ]
  }
]
```

---

### GET /api/public/products

Paginated products for a category. Default page size is 20. Returns one product image and one image per unique color variation.

**Query Params**
| Param | Required | Default | Description |
|-------|----------|---------|-------------|
| brandSlug | yes | — | Brand slug |
| categoryId | yes | — | Category UUID |
| filter | no | — | Filter slug (see below) |
| page | no | 1 | Page number |
| size | no | 20 | Results per page (max 100) |

**Filter slugs**
| Slug | Effect |
|------|--------|
| `under-15` | `min_price_cents ≤ 1500` |
| `15-25` | `1500 ≤ min_price_cents ≤ 2500` |
| `25-plus` | `min_price_cents ≥ 2500` |
| `sale` | `sale = true` |

Unknown filter slugs are silently ignored — all products are returned.

**Errors:** `400` missing brandSlug or categoryId · `500` DB failure

**Response `200`**
```json
{
  "products": [
    {
      "id": "uuid",
      "name": "Sport Sunglasses",
      "slug": "sport-sunglasses",
      "minPriceCents": 1650,
      "maxPriceCents": 1995,
      "salePriceCents": null,
      "featured": false,
      "sale": false,
      "imageSrc": "https://...",
      "imageName": "Sport Sunglasses Front",
      "variations": [
        {
          "id": "uuid",
          "option": "Gloss Black",
          "slug": "gloss-black",
          "value": "#000000",
          "imageSrc": "https://...",
          "imageName": "Gloss Black Angle"
        }
      ]
    }
  ],
  "page": 1,
  "size": 20,
  "totalPages": 3,
  "totalProducts": 62,
  "hasNextPage": true
}
```

---

### GET /api/public/sale

Paginated sale products (`sale = true`). Same response shape as `/products`. No `sale` filter slug needed.

**Query Params**
| Param | Required | Default | Description |
|-------|----------|---------|-------------|
| brandSlug | yes | — | Brand slug |
| filter | no | — | `under-15`, `15-25`, or `25-plus` |
| page | no | 1 | Page number |
| size | no | 20 | Results per page (max 100) |

**Errors:** `400` missing brandSlug · `500` DB failure

**Response `200`** — same shape as `/products`.

---

### GET /api/public/item

Full product detail including all variations, all images, and description images.

**Query Params**
| Param | Required | Description |
|-------|----------|-------------|
| brandSlug | yes | Brand slug |
| productSlug | yes | Product slug |

**Errors:** `400` missing params · `404` product not found · `500` DB failure

**Response `200`**
```json
{
  "id": "uuid",
  "name": "Sport Sunglasses",
  "slug": "sport-sunglasses",
  "sku": null,
  "description": "Full description...",
  "summary": ["Feature 1", "Feature 2"],
  "attributes": [
    {
      "name": "color",
      "options": [
        { "option": "Gloss Black", "slug": "gloss-black", "value": "#000000" },
        { "option": "Tortoise", "slug": "tortoise", "value": "#8b4513" }
      ]
    },
    {
      "name": "size",
      "options": [
        { "option": "Standard", "slug": "standard" },
        { "option": "Large", "slug": "large" }
      ]
    }
  ],
  "featured": false,
  "sale": false,
  "minPriceCents": 1650,
  "maxPriceCents": 1995,
  "salePriceCents": null,
  "variations": [
    {
      "sku": "SKU-BLK-STD",
      "attribute": [
        { "name": "color", "slug": "gloss-black" },
        { "name": "size", "slug": "standard" }
      ],
      "sale": false,
      "regularPriceCents": 1650,
      "salePriceCents": null,
      "images": [{ "src": "https://...", "name": "Black Front", "sortOrder": 1 }]
    }
  ],
  "productImages": [{ "src": "https://...", "name": "Front", "sortOrder": 1 }],
  "descriptionImages": [{ "src": "https://...", "name": "Diagram" }]
}
```

Note: variation `attribute` entries are `{ name, slug }` only — use the top-level `attributes` to look up display labels and hex values by slug. `value` is only present on `color` options there.

---

### GET /api/public/search

Case-insensitive product name search. Returns up to 6 results.

**Query Params**
| Param | Required | Description |
|-------|----------|-------------|
| brandSlug | yes | Brand slug |
| search | yes | Search query |

**Errors:** `400` missing params · `500` DB failure

**Response `200`**
```json
[
  {
    "id": "uuid",
    "name": "Sport Sunglasses",
    "slug": "sport-sunglasses",
    "minPriceCents": 1650,
    "maxPriceCents": 1995,
    "salePriceCents": null,
    "featured": false,
    "sale": false,
    "imageSrc": "https://...",
    "imageName": "Sport Sunglasses Front"
  }
]
```

---

### GET /api/public/filler

Returns `n` randomly shuffled products for a brand. Fetches `2n` from the DB and shuffles in JS. No category, filters, or pagination. Same product shape as `/products`.

**Query Params**
| Param | Required | Default | Description |
|-------|----------|---------|-------------|
| brandSlug | yes | — | Brand slug |
| n | no | 20 | Number of products to return (max 100) |

**Errors:** `400` missing brandSlug · `500` DB failure

**Response `200`**
```json
[
  {
    "id": "uuid",
    "name": "Sport Sunglasses",
    "slug": "sport-sunglasses",
    "minPriceCents": 1650,
    "maxPriceCents": 1995,
    "salePriceCents": null,
    "featured": false,
    "sale": false,
    "imageSrc": "https://...",
    "imageName": "Sport Sunglasses Front",
    "variations": [
      {
        "id": "uuid",
        "option": "Gloss Black",
        "slug": "gloss-black",
        "value": "#000000",
        "imageSrc": "https://...",
        "imageName": "Gloss Black Angle"
      }
    ]
  }
]
```

---

### GET /api/public/packages

Returns all TBYB packages for a brand.

**Query Params**
| Param | Required | Description |
|-------|----------|-------------|
| brandSlug | yes | Brand slug |

**Errors:** `400` missing brandSlug · `500` DB failure

**Response `200`**
```json
[
  {
    "id": "uuid",
    "name": "BikerArmour",
    "slug": "bikerarmour",
    "priceCents": 22900,
    "imageSrc": "https://zgcekcoatiskqbdruadg.supabase.co/storage/v1/object/public/bikershades/packages/bikerarmour.webp",
    "pairsMin": 3,
    "pairsMax": 5,
    "brands": ["BikerArmour"]
  }
]
```

---

### POST /api/public/views

Atomically increments the view count for a category or product. Pass exactly one of `categoryId` or `productSlug` alongside `brandSlug`.

**Errors:** `400` missing or invalid params · `500` DB failure

**Body**
```json
{ "brandSlug": "sunglass-monster", "categoryId": "uuid" }
```
```json
{ "brandSlug": "sunglass-monster", "productSlug": "sport-sunglasses" }
```

**Response `200`**
```json
{ "categoryId": "uuid" }
```
```json
{ "productSlug": "sport-sunglasses" }
```

---

### POST /api/public/validate-cart

Checks whether each cart item exists and whether the price matches the current DB price. Call on cart page entry and before checkout.

**Errors:** `400` missing params · `500` DB failure

**Status codes**
| Status | Meaning |
|--------|---------|
| `200` | All items exist and prices match |
| `404` | One or more items don't exist |
| `409` | One or more prices changed |
| `422` | Both missing items and changed prices |

**Body**
```json
{
  "brandSlug": "sunglass-monster",
  "items": [
    { "productSlug": "sport-sunglasses", "sku": "SKU-BLK", "priceCents": 1650 }
  ]
}
```

**Response `200`**
```json
[
  { "productSlug": "sport-sunglasses", "sku": "SKU-BLK", "exists": true, "priceCents": 1650, "priceChanged": false }
]
```

**Response `404`/`409`/`422`**
```json
{ "success": false, "message": "Cart validation failed", "data": [
  { "productSlug": "sport-sunglasses", "sku": "SKU-BLK", "exists": true,  "priceCents": 1650, "priceChanged": false },
  { "productSlug": "old-product",      "sku": "SKU-OLD", "exists": false, "priceCents": null, "priceChanged": false }
]}
```

---

## Authenticated Endpoints

All require `Authorization: Bearer <supabase_access_token>`. Queries are scoped to `user_id` + `brand_slug` via RLS.

### POST /api/user/cart

Returns the user's cart items for a brand.

**Errors:** `400` missing brandSlug · `401` invalid token · `500` DB failure

**Body**
```json
{ "brandSlug": "sunglass-monster" }
```

**Response `200`**
```json
[
  {
    "productId": "uuid",
    "productSlug": "sport-sunglasses",
    "sku": "SKU-BLK",
    "attribute": [{ "name": "color", "option": "Gloss Black", "slug": "gloss-black" }],
    "name": "Sport Sunglasses",
    "imageSrc": "https://...",
    "priceCents": 1650,
    "quantity": 2
  }
]
```

---

### PUT /api/user/cart

Replaces the user's cart for a brand (delete + insert). Pass an empty array to clear.

**Errors:** `400` missing params · `401` invalid token · `500` DB failure

**Body**
```json
{
  "brandSlug": "sunglass-monster",
  "items": [
    {
      "productId": "uuid",
      "productSlug": "sport-sunglasses",
      "sku": "SKU-BLK",
      "attribute": [{ "name": "color", "option": "Gloss Black", "slug": "gloss-black" }],
      "name": "Sport Sunglasses",
      "imageSrc": "https://...",
      "priceCents": 1650,
      "quantity": 2
    }
  ]
}
```

**Response `200`**
```json
{ "synced": 1 }
```

---

### POST /api/user/bookmarks

Returns the user's bookmarks for a brand.

**Errors:** `400` missing brandSlug · `401` invalid token · `500` DB failure

**Body**
```json
{ "brandSlug": "sunglass-monster" }
```

**Response `200`**
```json
[
  {
    "productId": "uuid",
    "productSlug": "sport-sunglasses",
    "name": "Sport Sunglasses",
    "imageSrc": "https://..."
  }
]
```

---

### PUT /api/user/bookmarks

Replaces the user's bookmarks for a brand (delete + insert). Pass an empty array to clear.

**Errors:** `400` missing params · `401` invalid token · `500` DB failure

**Body**
```json
{
  "brandSlug": "sunglass-monster",
  "items": [
    {
      "productId": "uuid",
      "productSlug": "sport-sunglasses",
      "name": "Sport Sunglasses",
      "imageSrc": "https://..."
    }
  ]
}
```

**Response `200`**
```json
{ "synced": 1 }
```

---

### POST /api/user/orders

Returns the user's order history for a brand, newest first.

**Errors:** `400` missing brandSlug · `401` invalid token · `500` DB failure

**Body**
```json
{ "brandSlug": "sunglass-monster" }
```

**Response `200`**
```json
[
  {
    "id": "uuid",
    "status": "processing",
    "totalCents": 7774,
    "refundedCents": null,
    "carrier": null,
    "trackingNumber": null,
    "shippingAddress": {
      "name": "John Smith",
      "line1": "123 Main St",
      "line2": null,
      "city": "Austin",
      "state": "TX",
      "postalCode": "78701",
      "country": "US"
    },
    "createdAt": "2026-06-18T18:35:31.167Z",
    "items": [
      {
        "id": "uuid",
        "productSlug": "sport-sunglasses",
        "name": "Sport Sunglasses",
        "imageSrc": "https://...",
        "priceCents": 1650,
        "quantity": 2,
        "attribute": "Gloss Black / Standard"
      }
    ]
  }
]
```

`attribute` is a display string (e.g. `"Gloss Black / Standard"`) for variation products, or `null` for simple products.

Order status values: `processing`, `shipped`, `refunded`. Partial refunds do not change the status — detect them via `refundedCents > 0 && status !== "refunded"`. `refundedCents` is `null` if no refund has occurred, or a positive integer (cumulative cents refunded).

---

### POST /api/user/submissions

Returns the authenticated user's TBYB submission history for a brand, newest first. Scoped by RLS — only the user's own submissions are returned.

**Errors:** `400` missing brandSlug · `401` invalid token · `500` DB failure

**Body**
```json
{ "brandSlug": "bikershades" }
```

**Response `200`**
```json
[
  {
    "id": "uuid",
    "status": "Processing",
    "createdAt": "2026-07-01T12:00:00.000Z",
    "packageName": "BikerArmour",
    "packagePriceCents": 22900,
    "packagePairsMin": 3,
    "packagePairsMax": 5,
    "packageBrands": ["BikerArmour"],
    "packageImageSrc": "https://...",
    "odSphere": "-1.25",
    "odCylinder": "-0.50",
    "odAxis": "90",
    "osSphere": "None",
    "osCylinder": "None",
    "osAxis": "None",
    "lensType": "Single Vision",
    "helmetSize": "Large",
    "hatSize": "7¼",
    "noseBridge": "Thin & Narrow",
    "buyingPreference": "All Styles & Sizes Fit",
    "frameType": "With Foam Cushion",
    "specialRequests": "None",
    "prescriptionUrl": "None",
    "headshotUrl": "None",
    "contactName": "John Smith",
    "contactEmail": "customer@example.com",
    "contactPhone": "None"
  }
]
```

Status values: `Unpaid`, `Processing`, `Emailed`, `Curating`, `Shipped`, `Received`, `Refunded`. `Unpaid` is set on submission before payment; `Refunded` is set by the Stripe webhook on full refund. Both are system-set and not admin-editable. Optional fields (`specialRequests`, `prescriptionUrl`, `headshotUrl`, `contactPhone`, and unselected prescription fields) are `"None"` when not provided.

---

### POST /api/user/upload

Uploads a file to the brand's Supabase Storage bucket under the `tbyb/` folder and returns the public URL. Used for prescription and headshot uploads before form submission.

**Request:** `multipart/form-data` with a `file` field and a `brandSlug` field. Uploads to the brand's storage bucket.

**Errors:** `400` missing file or brandSlug · `401` invalid token · `500` storage failure

**Response `200`**
```json
{ "url": "https://..." }
```

---

### POST /api/user/tbyb

Submits a Try Before You Buy form. Saves the submission with status `"Unpaid"`, then creates a Stripe checkout session for the package deposit. The submission moves to `"Processing"` after successful payment via the Stripe webhook.

**Errors:** `400` missing required fields · `401` invalid token · `404` package not found · `500` DB or Stripe failure

**Body**
```json
{
  "brandSlug": "bikershades",
  "successUrl": "https://yourdomain.com/",
  "cancelUrl": "https://yourdomain.com/",
  "submission": {
    "packageId": "uuid-of-selected-package",
    "odSphere": "-1.25",
    "odCylinder": "-0.50",
    "odAxis": "90",
    "osSphere": "None",
    "osCylinder": "None",
    "osAxis": "None",
    "lensType": "Single Vision",
    "helmetSize": "Large",
    "hatSize": "7¼",
    "noseBridge": "Thin & Narrow",
    "sunglassFit": "All Styles & Sizes Fit",
    "frameType": "With Foam Cushion",
    "comments": "None",
    "prescriptionUrl": "None",
    "headshotUrl": "None",
    "name": "John Smith",
    "email": "customer@example.com",
    "phone": "None"
  }
}
```

All form fields are required strings. Optional fields (`comments`, `phone`, `prescriptionUrl`, `headshotUrl`, and any unselected prescription/fitting fields) are sent as `"None"` when not provided — never `null`. `odAxis`/`osAxis` are `"None"` when their corresponding cylinder is `"None"`. `packageId` is the UUID from `tbyb_packages.id` — the backend looks up the package details and stores a snapshot on the submission.

**Response `200`**
```json
{ "url": "https://checkout.stripe.com/..." }
```

---

### POST /api/user/checkout

Creates a Stripe checkout session. Returns a redirect URL. Stripe collects the shipping address — no need to collect it on the frontend.

Prices, name, images, and attributes are pulled from the DB — the frontend only needs to send `productSlug`, `sku`, `priceCents`, and `quantity`. Idempotent — same cart state and order count returns the same session URL; any DB change (price, name, image) produces a new session.

**Errors:** `400` missing params · `401` invalid token · `500` Stripe session creation failed

**Status codes**
| Status | Meaning |
|--------|---------|
| `200` | Session created — follow the URL |
| `404` | One or more items don't exist |
| `409` | One or more prices changed |
| `422` | Both missing items and changed prices |

**Body**
```json
{
  "brandSlug": "sunglass-monster",
  "items": [
    {
      "productSlug": "sport-sunglasses",
      "sku": "SKU-BLK",
      "priceCents": 1650,
      "quantity": 2
    }
  ],
  "successUrl": "https://yourdomain.com/order/success",
  "cancelUrl": "https://yourdomain.com/cart"
}
```

**Response `200`**
```json
{ "url": "https://checkout.stripe.com/..." }
```

**Response `404`/`409`/`422`** — same shape as `/validate-cart` error response.
```json
{ "success": false, "message": "Cart validation failed", "data": [
  { "productSlug": "sport-sunglasses", "sku": "SKU-BLK", "exists": true, "priceCents": 1800, "priceChanged": true }
]}
```

---

## Webhooks

### POST /api/webhooks/stripe

Stripe webhook handler. Verified via `stripe-signature` header. Handles the following events:

**`checkout.session.completed`** — dispatches on `session.metadata.type`:
- `"order"` — inserts an `orders` row with status `processing` and `order_items` rows from expanded Stripe line items. Idempotent via `stripe_session_id`.
- `"tbyb"` — updates the matching `tbyb_submissions` row to status `Processing` and stores `stripe_session_id` / `stripe_payment_intent`.
- Unknown type — returns `400`.

**`charge.refunded`** — matched by `stripe_payment_intent`. Only fires if `charge.amount_refunded > 0`. Tries orders first; if no order rows are updated, falls back to updating the matching `tbyb_submissions` row to `Refunded`. For orders: sets `refunded_cents` to the cumulative refunded amount; sets `status` to `refunded` only on a full refund (`amount_refunded === amount`) — partial refunds update `refunded_cents` only.

All other events return `200` and are ignored.
