import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ok, err } from "@/lib/api";

type CategoryNode = {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  children?: CategoryNode[];
};

export async function GET(req: NextRequest) {
  const brandSlug = req.nextUrl.searchParams.get("brandSlug");
  if (!brandSlug) return err("Brand slug is required!", 400);

  const supabase = createAdminClient();

  const { data: brand, error: brandError } = await supabase
    .from("brands")
    .select("id")
    .eq("slug", brandSlug)
    .single();

  if (brandError || !brand) return err("Brand not found!", 404);

  const { data: categories } = await supabase
    .from("categories")
    .select("id, parent_id, name, slug, sort_order")
    .eq("brand_id", brand.id);


  const nodeMap: Record<string, CategoryNode> = {};
  for (const cat of categories ?? []) {
    nodeMap[cat.id] = { id: cat.id, name: cat.name, slug: cat.slug, sortOrder: cat.sort_order };
  }

  const roots: CategoryNode[] = [];
  for (const cat of categories ?? []) {
    const node = nodeMap[cat.id];
    if (cat.parent_id) {
      const parent = nodeMap[cat.parent_id];
      parent.children = parent.children ?? [];
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return ok(roots, 200);
}
