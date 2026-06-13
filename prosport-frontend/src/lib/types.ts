export type Brand = {
  id: string;
  name: string;
  slug: string;
};

export type CategoryNode = {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  children?: CategoryNode[];
};

export type ProductImage = {
  src: string;
  name: string;
};

export type ProductListItem = {
  id: string;
  name: string;
  slug: string;
  minPriceCents: number;
  maxPriceCents: number;
  salePriceCents: number | null;
  attributes: { name: string; options: string[] }[];
  featured: boolean;
  sale: boolean;
  images: ProductImage[];
};

export type ProductsResponse = {
  products: ProductListItem[];
  page: number;
  size: number;
  totalPages: number;
  totalProducts: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type VariationImage = {
  src: string;
  name: string;
  sortOrder: number;
};

export type Variation = {
  id: string;
  sku: string;
  attribute: { name: string; option: string }[];
  sale: boolean;
  regularPriceCents: number;
  salePriceCents: number | null;
  stock: number;
  images: VariationImage[];
};

export type ProductDetail = {
  id: string;
  name: string;
  sku: string | null;
  description: string;
  summary: string[];
  attributes: { name: string; options: string[] }[];
  featured: boolean;
  sale: boolean;
  minPriceCents: number;
  maxPriceCents: number;
  salePriceCents: number | null;
  stock: number | null;
  variations: Variation[];
  productImages: VariationImage[];
  descriptionImages: { src: string; name: string }[];
};

export type ApiResponse<T> = { success: true; data: T } | { success: false; error: string };
