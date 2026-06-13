import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { ProductListItem } from "@/lib/types";

type Props = {
  product: ProductListItem;
};

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function ProductCard({ product }: Props) {
  const thumbnail = product.images[0];
  const price =
    product.minPriceCents === product.maxPriceCents
      ? formatPrice(product.minPriceCents)
      : `${formatPrice(product.minPriceCents)} – ${formatPrice(product.maxPriceCents)}`;

  return (
    <Link href={`/product/${product.id}`}>
      <Card className="overflow-hidden hover:shadow-md transition-shadow">
        <div className="aspect-square relative bg-muted">
          {thumbnail ? (
            <Image
              src={thumbnail.src}
              alt={thumbnail.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 50vw, 25vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
              No image
            </div>
          )}
          {product.sale && (
            <span className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded">
              Sale
            </span>
          )}
        </div>
        <CardContent className="p-3">
          <p className="text-sm font-medium line-clamp-2">{product.name}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {product.salePriceCents ? (
              <>
                <span className="text-red-500 font-medium">{formatPrice(product.salePriceCents)}</span>{" "}
                <span className="line-through">{formatPrice(product.minPriceCents)}</span>
              </>
            ) : (
              price
            )}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
