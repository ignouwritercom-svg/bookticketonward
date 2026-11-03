import { verifiedCustomer } from "@/lib/supabase/server";
import { failure, json, readBody } from "@/lib/api";
import { uuidPattern } from "@/lib/account";
export async function POST(request: Request) {
  try {
    const body = await readBody(request) as { id?: string };
    const { client, user } = await verifiedCustomer();
    if (!client || !user) return failure("Sign in to your account.", 401);
    if (typeof body.id !== "string" || !uuidPattern.test(body.id)) return failure("Invalid notification.");
    const { error } = await client.rpc("read_order_notification", { p_id: body.id });
    if (error) return failure("Notification unavailable for this account.", 404);
    return json({ ok: true });
  } catch { return failure("Unable to update notification.", 403); }
}
