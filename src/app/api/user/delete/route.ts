import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createUserClient } from "@/lib/supabase/user";
import { ok, err } from "@/lib/api";

export async function POST(req: NextRequest) {
  const client = await createUserClient(req);
  if (!client) return err("Unauthorized", 401);

  const { error } = await createAdminClient().auth.admin.deleteUser(client.user.id);
  if (error) return err("Failed to delete account", 500);

  return ok({ deleted: true });
}
