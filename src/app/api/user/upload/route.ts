import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createUserClient } from "@/lib/supabase/user";
import { ok, err } from "@/lib/api";

export async function POST(req: NextRequest) {
  const client = await createUserClient(req);
  if (!client) return err("Unauthorized", 401);

  const formData = await req.formData();

  const file = formData.get("file") as File | null;
  if (!file) return err("file is required", 400);
  
  const brandSlug = formData.get("brandSlug") as string | null;
  if (!brandSlug) return err("brandSlug is required", 400);

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `packages/${safeName}-${crypto.randomUUID()}`;

  const adminSupabase = createAdminClient();

  const { data, error } = await adminSupabase.storage.from(brandSlug).upload(path, file);
  if (error) return err(error.message, 500);

  const { data: { publicUrl } } = adminSupabase.storage.from(brandSlug).getPublicUrl(data.path);

  return ok({ url: publicUrl });
}
