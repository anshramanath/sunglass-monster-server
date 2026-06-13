import { notFound } from "next/navigation";
import Image from "next/image";
import type { Metadata } from "next";
import { BRAND_SLUG, getItem } from "@/lib/api";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const product = await getItem(id, BRAND_SLUG).catch(() => null);
  return { title: product ? `${product.name} | proSPORT` : "Product | proSPORT" };
}

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params;
  const product = await getItem(id, BRAND_SLUG).catch(() => null);
  if (!product) notFound();

  const primaryImage = product.productImages[0];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
      {/* Images */}
      <div className="flex flex-col gap-3">
        <div className="aspect-square relative bg-muted rounded-lg overflow-hidden">
          {primaryImage ? (
            <Image
              src={primaryImage.src}
              alt={primaryImage.name}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No image</div>
          )}
        </div>
        <div className="grid grid-cols-4 gap-2">
          {product.productImages.slice(1).map((img, i) => (
            <div key={i} className="aspect-square relative bg-muted rounded overflow-hidden">
              <Image src={img.src} alt={img.name} fill className="object-cover" sizes="100px" />
            </div>
          ))}
        </div>
      </div>

      {/* Details */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{product.name}</h1>
          {product.sku && <p className="text-sm text-muted-foreground mt-1">SKU: {product.sku}</p>}
        </div>

        <div className="text-xl font-medium">
          {product.salePriceCents ? (
            <span>
              <span className="text-red-500">{formatPrice(product.salePriceCents)}</span>{" "}
              <span className="line-through text-muted-foreground text-base">
                {formatPrice(product.minPriceCents)}
              </span>
            </span>
          ) : product.minPriceCents === product.maxPriceCents ? (
            formatPrice(product.minPriceCents)
          ) : (
            `${formatPrice(product.minPriceCents)} – ${formatPrice(product.maxPriceCents)}`
          )}
        </div>

        <Separator />

        {/* Variants */}
        {product.variations.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Options</p>
            <div className="flex flex-wrap gap-2">
              {product.variations.map((v) => (
                <div key={v.id} className="border rounded px-3 py-1.5 text-sm">
                  {v.attribute.map((a) => a.option).join(", ")}
                  <span className="ml-2 text-muted-foreground">{formatPrice(v.regularPriceCents)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <Separator />

        {/* Summary */}
        {product.summary.length > 0 && (
          <ul className="space-y-1 text-sm">
            {product.summary.map((point, i) => (
              <li key={i} className="flex gap-2">
                <span>•</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        )}

        <Tabs defaultValue="description" className="mt-2">
          <TabsList>
            <TabsTrigger value="description">Description</TabsTrigger>
            {product.descriptionImages.length > 0 && (
              <TabsTrigger value="media">Media</TabsTrigger>
            )}
          </TabsList>
          <TabsContent value="description" className="text-sm text-muted-foreground leading-relaxed mt-3">
            {product.description}
          </TabsContent>
          {product.descriptionImages.length > 0 && (
            <TabsContent value="media" className="grid grid-cols-2 gap-3 mt-3">
              {product.descriptionImages.map((img, i) => (
                <div key={i} className="aspect-video relative bg-muted rounded overflow-hidden">
                  <Image src={img.src} alt={img.name} fill className="object-contain" sizes="300px" />
                </div>
              ))}
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
