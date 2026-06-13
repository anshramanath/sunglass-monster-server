import { Separator } from "@/components/ui/separator";

type Props = {
  name: string;
  totalProducts?: number;
};

export default function CategoryHeading({ name, totalProducts }: Props) {
  return (
    <div className="mb-6">
      <div className="flex items-baseline gap-3">
        <h1 className="text-2xl font-semibold">{name}</h1>
        {totalProducts !== undefined && (
          <span className="text-sm text-muted-foreground">{totalProducts} products</span>
        )}
      </div>
      <Separator className="mt-3" />
    </div>
  );
}
