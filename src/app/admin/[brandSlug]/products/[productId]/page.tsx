import { getBrandBySlug } from "@/lib/brand";
import { getCategoryOptions } from "@/lib/admin/products";
import { getProductDetail } from "@/lib/admin/product-detail";
import { ProductForm } from "./product-form";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ brandSlug: string; productId: string }>;
}) {
  const { brandSlug, productId } = await params;
  const isNew = productId === "new";

  const brand = getBrandBySlug(brandSlug)!;

  const [categories, product] = await Promise.all([
    getCategoryOptions(brandSlug),
    isNew ? Promise.resolve(null) : getProductDetail(brandSlug, productId),
  ]);

  return (
    <ProductForm
      brandSlug={brandSlug}
      accent={brand.accent}
      isNew={isNew}
      initialProductId={isNew ? undefined : productId}
      product={product}
      categories={categories}
    />
  );
}
