import { NextRequest } from "next/server";
import { createUserClient } from "@/lib/supabase/user";
import { ok, err } from "@/lib/api";

export async function POST(req: NextRequest) {
  const client = await createUserClient(req);
  if (!client) return err("Unauthorized", 401);

  const body = await req.json();

  const brandSlug = body.brandSlug;
  if (!brandSlug) return err("brandSlug is required", 400);

  const submissionId = body.submissionId;
  if (!submissionId) return err("submissionId is required", 400);

  const { supabase } = client;

  const { data, error } = await supabase
    .from("tbyb_submissions")
    .select("id, deposit_cents, refunded_cents")
    .eq("brand_slug", brandSlug);

  if (error) return err(error.message, 500);

  const sub = data.find((s) => s.id.slice(-8).toUpperCase() === submissionId.toUpperCase());
  if (!sub) return err("Submission not found", 404);

  if (sub.deposit_cents === null) return err("TBYB payment not completed", 402);

  const availableCents = Math.max(sub.deposit_cents - (sub.refunded_cents ?? 0), 0);

  return ok({ depositCents: availableCents });
}
