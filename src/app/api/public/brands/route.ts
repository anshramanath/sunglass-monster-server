import { createAdminClient } from "@/lib/supabase/admin";
import { ok, err } from "@/lib/api";

export async function GET() {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("brands")
    .select("id, name, slug")
    .order("name");

  if (error) return err("Failed to fetch brands!", 500);

  return ok(data, 200);
}
