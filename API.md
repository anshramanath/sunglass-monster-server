# Public API Contract

All endpoints return:
```json
{ "success": true, "data": { ... } }
{ "success": false, "error": "Message!" }
```

---

## GET /api/public/brands

Returns all brands.

**Response**
```json
[
  { "id": "uuid", "name": "Sunglass Monster", "slug": "sunglass-monster" }
]
```

---

## GET /api/public/categories

Returns the category tree for a brand. `sortOrder` is the client's source of truth for ordering.

**Query Params**
| Param | Required | Description |
|-------|----------|-------------|
| brandSlug | yes | Brand slug |

**Response**
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

## GET /api/public/products

Returns paginated products for a leaf category. Only in-stock products are returned.

**Query Params**
| Param | Required | Default | Description |
|-------|----------|---------|-------------|
| brandSlug | yes | — | Brand slug |
| categoryId | yes | — | Leaf category id |
| page | no | 1 | Page number |
| size | no | 24 | Results per page (max 100) |

**Response**
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
      "attributes": [{ "name": "color", "options": ["Black", "Tortoise"] }],
      "featured": false,
      "sale": false,
      "images": [
        { "src": "https://...", "name": "Front" }
      ]
    }
  ],
  "page": 1,
  "size": 24,
  "totalPages": 3,
  "totalProducts": 62,
  "hasNextPage": true,
  "hasPreviousPage": false
}
```

---

## GET /api/public/item

Returns full product detail including variations, images, and description images.

**Query Params**
| Param | Required | Description |
|-------|----------|-------------|
| productId | yes | Product id |
| brandSlug | yes | Brand slug |

**Response**
```json
{
  "id": "uuid",
  "name": "Sport Sunglasses",
  "sku": null,
  "description": "Full description...",
  "summary": ["Feature 1", "Feature 2"],
  "attributes": [{ "name": "color", "options": ["Black", "Tortoise"] }],
  "featured": false,
  "sale": false,
  "minPriceCents": 1650,
  "maxPriceCents": 1995,
  "salePriceCents": null,
  "stock": 10,
  "variations": [
    {
      "id": "uuid",
      "sku": "SKU-BLK",
      "attribute": [{ "name": "color", "option": "Black" }],
      "sale": false,
      "regularPriceCents": 1650,
      "salePriceCents": null,
      "stock": 5,
      "images": [
        { "src": "https://...", "name": "Black Front", "sortOrder": 1 }
      ]
    }
  ],
  "productImages": [
    { "src": "https://...", "name": "Front", "sortOrder": 1 }
  ],
  "descriptionImages": [
    { "src": "https://...", "name": "Diagram" }
  ]
}
```
