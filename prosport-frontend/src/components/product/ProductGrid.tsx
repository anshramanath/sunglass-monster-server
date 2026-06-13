import { ProductListItem } from "@/lib/types";
import ProductCard from "./ProductCard";
import EmptyState from "@/components/shared/EmptyState";

type Props = {
  products: ProductListItem[];
};

export default function ProductGrid({ products }: Props) {
  if (products.length === 0) return <EmptyState />;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
