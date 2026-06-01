# BikerShades Frontend Handoff

## Architecture

```
Frontend → POST /api/public/* → Next.js (service_role) → Supabase
```

The frontend never calls Supabase directly. All public endpoints are read-only and require no auth.

---

## Base URL

```
/api/public
```

All endpoints accept `Content-Type: application/json` POST requests.

**Success**
```json
{ "success": true, "data": ... }
```

**Error**
```json
{ "success": false, "error": "message" }
```

---

## Data Model Rules

| Field | Role |
|---|---|
| `id` (uuid) | Source of truth — always store and send this for lookups |
| `slug` | Display and URL helper only — not guaranteed unique, never use for API lookups |
| `sku` | Globally unique across all products and variations |
| `name` | What the UI displays |

**All prices are in cents.** Divide by 100 for display.

**Stock invariant:** `product.stock > 0` ↔ at least one variation is available. The backend maintains this. Use `product.stock` for listing-level filtering; use `variation.stock` for the selected variation on the detail page.

**Naming convention:** All public API fields are camelCase. The database schema is an internal detail.

---

## Endpoints

---

### POST /api/public/brands

**Request**
```json
{}
```

**Response**
```json
{
  "success": true,
  "data": [
    { "id": "uuid", "name": "BikerShades", "slug": "bikershades" }
  ]
}
```

Returns all brands ordered alphabetically. For the BikerShades storefront, hardcode the brand slug and do not call this endpoint at runtime:

```ts
const BRAND_SLUG = "bikershades";
```

Only call `POST /api/public/brands` if building a multi-brand landing page in the future.

---

### POST /api/public/categories/tree

**Request**
```json
{ "brandSlug": "bikershades" }
```

**Response**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Sunglasses",
      "slug": "sunglasses",
      "productCount": 173,
      "children": [
        {
          "id": "uuid",
          "name": "Brands",
          "slug": "brands",
          "productCount": 173,
          "children": [
            {
              "id": "uuid",
              "name": "Wiley X",
              "slug": "wiley-x",
              "productCount": 45,
              "children": []
            }
          ]
        }
      ]
    }
  ]
}
```

**`productCount`** on every node includes all products in that node's entire subtree. Products are only assigned to leaf categories in the database — parent counts are rolled up recursively by the backend.

**`parent_id` is not in the response.** The tree structure encodes parent relationships via `children`. When building a flat map for breadcrumbs, derive `parentId` from the traversal (see Breadcrumbs section below).

**Fetch once on app load.** Store the tree globally. Use it for navbar, mobile menu, sidebar, footer, and breadcrumbs — no additional requests needed.

---

### POST /api/public/products/search

**Request**
```json
{
  "brandSlug": "bikershades",
  "categoryId": "uuid",
  "search": "wiley",
  "page": 1,
  "limit": 24,
  "saleOnly": false,
  "inStockOnly": false,
  "sort": "name_asc"
}
```

Only `brandSlug` is required. All other fields are optional.

| Field | Default | Notes |
|---|---|---|
| `categoryId` | — | UUID from category tree. Expands to all descendants automatically. |
| `search` | — | Matches `name` and `sku`. Characters `,%()` stripped. |
| `page` | `1` | Clamped to ≥ 1. |
| `limit` | `24` | Clamped to 1–100. |
| `saleOnly` | `false` | |
| `inStockOnly` | `false` | Uses `product.stock > 0`. |
| `sort` | `name_asc` | `name_asc` · `name_desc` · `price_asc` · `price_desc` |

**Response**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "uuid",
        "name": "Wiley X Gravity",
        "slug": "wiley-x-gravity",
        "minPriceCents": 4999,
        "maxPriceCents": 6999,
        "salePriceCents": null,
        "sale": false,
        "stock": 1,
        "thumbnail": "https://..."
      }
    ],
    "page": 1,
    "limit": 24,
    "totalPages": 8,
    "totalProducts": 173,
    "hasNextPage": true,
    "hasPreviousPage": false,
    "filters": {
      "brandSlug": "bikershades",
      "categoryId": "uuid",
      "search": null,
      "saleOnly": false,
      "inStockOnly": false,
      "sort": "name_asc"
    }
  }
}
```

**Price fields on product cards:**

| Condition | Display |
|---|---|
| `sale && salePriceCents !== null` | Strikethrough `minPriceCents`, then `salePriceCents` |
| `sale && salePriceCents === null` | Sale badge + regular price range (variation-level sale — exact price on detail page) |
| `!sale` | Regular price range `minPriceCents`–`maxPriceCents` |

**`thumbnail`** is the first `product_images` row by `sort_order`. May be `null`.

**`filters`** echoes the active query state — useful for syncing UI controls to the current response.

**`limit`** reflects the actual clamped value used — always read from the response, not your request.

---

### POST /api/public/products/detail

**Request**
```json
{ "brandSlug": "bikershades", "productId": "uuid" }
```

Use `product.id` from search results. Do not use `slug` for this lookup — product slugs are not guaranteed unique.

**Response**
```json
{
  "success": true,
  "data": {
    "product": {
      "id": "uuid",
      "brandId": "uuid",
      "name": "Wiley X Gravity",
      "slug": "wiley-x-gravity",
      "sku": "WX-GRAVITY",
      "description": "Full HTML or plain text description.",
      "summary": ["Polarized lens", "TR90 frame", "ANSI Z87.1 rated"],
      "attributes": { "material": "TR90", "warranty": "Lifetime" },
      "sale": false,
      "minPriceCents": 4999,
      "maxPriceCents": 6999,
      "salePriceCents": null,
      "stock": 5,
      "weight": 1.2,
      "weightUnit": "oz",
      "length": null,
      "width": null,
      "height": null,
      "dimensionUnit": null
    },
    "variations": [
      {
        "id": "uuid",
        "productId": "uuid",
        "slug": "wiley-x-gravity-black-smoke",
        "sku": "WX-GRAVITY-BLK-SMK",
        "attributes": [
          { "name": "Color", "value": "Gloss Black" },
          { "name": "Lens", "value": "Smoke Gray" }
        ],
        "description": null,
        "sale": false,
        "regularPriceCents": 4999,
        "salePriceCents": null,
        "stock": 3,
        "weight": null,
        "weightUnit": null,
        "length": null,
        "width": null,
        "height": null,
        "dimensionUnit": null,
        "images": [
          {
            "id": "uuid",
            "variationId": "uuid",
            "src": "https://...",
            "name": "gravity-black-smoke-front",
            "sortOrder": 0
          }
        ]
      }
    ],
    "categories": [
      { "id": "uuid", "name": "Wiley X", "slug": "wiley-x", "parentId": "uuid" }
    ],
    "productImages": [
      { "id": "uuid", "src": "https://...", "name": "gravity-main", "sortOrder": 0 }
    ],
    "descriptionImages": [
      { "id": "uuid", "src": "https://...", "name": "gravity-lifestyle", "sortOrder": 0 }
    ]
  }
}
```

**Field notes:**

- `product.summary` — string array, render as `<ul>`.
- `product.attributes` — freeform JSON object, render as a specs table.
- `variations` — sorted by `sku` ascending.
- `variation.attributes` — structured array, no parsing needed. Iterate directly to build selectors.
- `variation.images` — variation-specific gallery. If empty, fall back to `productImages`.
- `productImages` — main product gallery, ordered by `sortOrder`.
- `descriptionImages` — lifestyle/rich-content images for the description body, ordered by `sortOrder`.
- `categories` — the categories this product belongs to. Use with the flat category map for breadcrumbs.

**Price logic per variation:**

| Condition | Display |
|---|---|
| `variation.sale && variation.salePriceCents !== null` | Strikethrough `regularPriceCents`, then `salePriceCents` |
| `variation.sale && variation.salePriceCents === null` | Sale badge + `regularPriceCents` |
| `!variation.sale` | `regularPriceCents` |

**Stock:** `variation.stock === 0` → show "Out of Stock", disable add-to-cart.

---

## TypeScript Types

```ts
type ApiResponse<T> = { success: true; data: T } | { success: false; error: string };

// --- Brands ---

type Brand = {
  id: string;
  name: string;
  slug: string;
};

// --- Category tree ---

type CategoryNode = {
  id: string;
  name: string;
  slug: string;
  productCount: number;
  children?: CategoryNode[];
};

// Flat map built client-side from the tree (parentId added during traversal)
type FlatCategoryNode = CategoryNode & { parentId: string | null };
type CategoryMap = Record<string, FlatCategoryNode>;

// --- Product search ---

type ProductSummary = {
  id: string;
  name: string;
  slug: string;
  minPriceCents: number;
  maxPriceCents: number;
  salePriceCents: number | null;
  sale: boolean;
  stock: number;
  thumbnail: string | null;
};

type ProductSearchResponse = {
  products: ProductSummary[];
  page: number;
  limit: number;
  totalPages: number;
  totalProducts: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  filters: {
    brandSlug: string;
    categoryId: string | null;
    search: string | null;
    saleOnly: boolean;
    inStockOnly: boolean;
    sort: string;
  };
};

// --- Product detail ---

type ProductImage = {
  id: string;
  src: string;
  name: string;
  sortOrder: number;
};

type VariationImage = {
  id: string;
  variationId: string;
  src: string;
  name: string;
  sortOrder: number;
};

type VariationAttribute = {
  name: string;
  value: string;
};

type Variation = {
  id: string;
  productId: string;
  slug: string;
  sku: string;
  attributes: VariationAttribute[];
  description: string | null;
  sale: boolean;
  regularPriceCents: number;
  salePriceCents: number | null;
  stock: number;
  weight: number | null;
  weightUnit: string | null;
  length: number | null;
  width: number | null;
  height: number | null;
  dimensionUnit: string | null;
  images: VariationImage[];
};

type Product = {
  id: string;
  brandId: string;
  name: string;
  slug: string;
  sku: string;
  description: string | null;
  summary: string[];
  attributes: Record<string, string> | null;
  sale: boolean;
  minPriceCents: number;
  maxPriceCents: number;
  salePriceCents: number | null;
  stock: number;
  weight: number | null;
  weightUnit: string | null;
  length: number | null;
  width: number | null;
  height: number | null;
  dimensionUnit: string | null;
};

type ProductDetailResponse = {
  product: Product;
  variations: Variation[];
  categories: { id: string; name: string; slug: string; parentId: string | null }[];
  productImages: ProductImage[];
  descriptionImages: ProductImage[];
};
```

---

## Page-by-Page Implementation Guide

### App Load

1. Call `POST /api/public/categories/tree` with `{ brandSlug: "bikershades" }`.
2. Build a flat map keyed by `id`, recording `parentId` during traversal:

```ts
function buildCategoryMap(
  nodes: CategoryNode[],
  map: CategoryMap = {},
  parentId: string | null = null
): CategoryMap {
  for (const node of nodes) {
    map[node.id] = { ...node, parentId };
    if (node.children?.length) buildCategoryMap(node.children, map, node.id);
  }
  return map;
}
```

3. Store both the tree (for nav rendering) and the flat map (for breadcrumbs) globally.

---

### Navbar / Mobile Menu

- Render root nodes as top-level nav items.
- Render `node.children` as dropdown/flyout items.
- Attach `node.id` to each item — pass as `categoryId` to product search on click.
- `node.productCount` is available for badges if needed.

---

### Breadcrumbs

Derive client-side from the flat map — no extra API call:

```ts
function getBreadcrumbs(categoryId: string, map: CategoryMap): FlatCategoryNode[] {
  const crumbs: FlatCategoryNode[] = [];
  let node = map[categoryId];
  while (node) {
    crumbs.unshift(node);
    node = node.parentId ? map[node.parentId] : null;
  }
  return crumbs;
}
```

Always walk by `id`. Never use `slug` for breadcrumb traversal.

---

### Category / Listing Page

1. Call `POST /api/public/products/search` with `{ brandSlug, categoryId, page: 1, limit: 24 }`.
2. Render product cards from `products[]`.
3. Apply price display logic from the table above.
4. Wire `sort` dropdown, `saleOnly`/`inStockOnly` toggles to re-fetch.
5. Paginate using `hasNextPage`, `hasPreviousPage`, `totalPages`.
6. On card click, navigate to product detail using `product.id`.

---

### Search Results Page

Same as listing page. Pass `search` instead of (or in addition to) `categoryId`.

---

### Product Detail Page

1. Call `POST /api/public/products/detail` with `{ brandSlug, productId }`.
2. Render `product.name`, `product.description`, `product.summary` as `<ul>`, `product.attributes` as a specs table.
3. Build variation selectors from `variation.attributes[]` — group by `name`, list `value` options.
4. On variation select:
   - Show `variation.images` as the gallery if non-empty; otherwise show `productImages`.
   - Apply per-variation price logic from the table above.
   - Disable add-to-cart if `variation.stock === 0`.
5. Render `descriptionImages` in the description body.
6. For cart line item, store:
   - `product.id`
   - `variation.id`
   - `variation.sku`
   - `variation.attributes` (the selected attribute values to display in cart)
   - `variation.regularPriceCents` and `variation.salePriceCents`
   - The image URL shown for that variation (first `variation.images[0].src`, or `productImages[0].src` if empty)
   - `quantity`

---

## What This API Does Not Cover

The following must be implemented separately:

- Cart (client-side state or a dedicated service)
- Checkout and payment
- Customer accounts and auth
- Order history
- Admin operations (`POST /api/admin/*`, auth required, separate contract)
