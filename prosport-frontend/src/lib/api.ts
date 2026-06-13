import type { ApiResponse, CategoryNode, ProductDetail, ProductsResponse } from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://sunglass-monster-server.vercel.app";
export const BRAND_SLUG = process.env.NEXT_PUBLIC_BRAND_SLUG ?? "prosport-sunglasses";

async function apiFetch<T>(path: string, params: Record<string, string | number>): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }
  const res = await fetch(url.toString(), { next: { revalidate: 60 } });
  const json: ApiResponse<T> = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}


export function getCategories(brandSlug: string): Promise<CategoryNode[]> {
  return apiFetch("/api/public/categories", { brandSlug });
}

export function getProducts(params: {
  brandSlug: string;
  categoryId: string;
  page?: number;
  size?: number;
}): Promise<ProductsResponse> {
  return apiFetch("/api/public/products", {
    brandSlug: params.brandSlug,
    categoryId: params.categoryId,
    page: params.page ?? 1,
    size: params.size ?? 24,
  });
}

export function getItem(productId: string, brandSlug: string): Promise<ProductDetail> {
  return apiFetch("/api/public/item", { productId, brandSlug });
}
