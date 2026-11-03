import { verifiedCustomer } from "@/lib/supabase/server";
import { failure, json, unavailable } from "@/lib/api";
import { uuidPattern } from "@/lib/account";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { client, user } = await verifiedCustomer();
    if (!client) return unavailable();
    if (!user) return failure("Sign in to resume this saved draft.", 401);
    const { id } = await context.params;
    if (!uuidPattern.test(id)) return failure("Draft not found.", 404);
    const { data, error } = await client
      .from("booking_drafts")
      .select("id,data,revision,status,updated_at")
      .eq("id", id)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (error) return failure("Unable to load this draft. Please retry.", 503);
    if (!data) return failure("Draft not found.", 404);
    if (data.status !== "draft")
      return failure(
        "This draft already has an order. View it in your dashboard.",
        409,
      );
    return json({ draft: data });
  } catch {
    return failure("Unable to load this draft. Please retry.", 503);
  }
}
