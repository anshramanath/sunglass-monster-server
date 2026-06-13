import Link from "next/link";
import { Suspense } from "react";
import { BRAND_SLUG, getCategories } from "@/lib/api";
import { CategoryNode } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import LoadingSkeleton from "@/components/shared/LoadingSkeleton";

function flattenLeaves(nodes: CategoryNode[]): CategoryNode[] {
  return nodes.flatMap((n) => (n.children?.length ? flattenLeaves(n.children) : [n]));
}

function buildPath(nodes: CategoryNode[], target: CategoryNode, path: string[] = []): string[] | null {
  for (const node of nodes) {
    const current = [...path, node.slug];
    if (node.id === target.id) return current;
    if (node.children) {
      const found = buildPath(node.children, target, current);
      if (found) return found;
    }
  }
  return null;
}

async function CategoryGrid() {
  const tree = await getCategories(BRAND_SLUG);
  const roots = [...tree].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {roots.flatMap((root) => {
        const leaves = flattenLeaves([root]);
        return leaves.map((leaf) => {
          const path = buildPath(tree, leaf);
          const href = path ? `/category/${path.join("/")}` : `/category/${leaf.slug}`;
          return (
            <Link key={leaf.id} href={href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">{root.name}</p>
                  <p className="font-medium">{leaf.name}</p>
                </CardContent>
              </Card>
            </Link>
          );
        });
      })}
    </div>
  );
}

export default function HomePage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">proSPORT Sunglasses</h1>
      <p className="text-muted-foreground mb-8">Shop by category</p>
      <Suspense fallback={<LoadingSkeleton />}>
        <CategoryGrid />
      </Suspense>
    </div>
  );
}
