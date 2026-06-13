import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BRAND_SLUG, getCategories, getProducts } from "@/lib/api";
import { CategoryNode } from "@/lib/types";
import CategoryHeading from "@/components/category/CategoryHeading";
import ProductGrid from "@/components/product/ProductGrid";
import LoadingSkeleton from "@/components/shared/LoadingSkeleton";

function walkTree(nodes: CategoryNode[], slugPath: string[]): CategoryNode | null {
  const [head, ...rest] = slugPath;
  const node = nodes.find((n) => n.slug === head);
  if (!node) return null;
  if (rest.length === 0) return node;
  if (!node.children) return null;
  return walkTree(node.children, rest);
}

type Props = { params: Promise<{ slugPath: string[] }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slugPath } = await params;
  const tree = await getCategories(BRAND_SLUG);
  const category = walkTree(tree, slugPath);
  return { title: category ? `${category.name} | proSPORT` : "Category | proSPORT" };
}

async function ProductSection({ categoryId, categoryName }: { categoryId: string; categoryName: string }) {
  const data = await getProducts({ brandSlug: BRAND_SLUG, categoryId, page: 1, size: 24 });
  return (
    <>
      <CategoryHeading name={categoryName} totalProducts={data.totalProducts} />
      <ProductGrid products={data.products} />
    </>
  );
}

export default async function CategoryPage({ params }: Props) {
  const { slugPath } = await params;
  const tree = await getCategories(BRAND_SLUG);
  const category = walkTree(tree, slugPath);
  if (!category) notFound();

  return (
    <Suspense fallback={<><div className="h-10 mb-6" /><LoadingSkeleton /></>}>
      <ProductSection categoryId={category.id} categoryName={category.name} />
    </Suspense>
  );
}
