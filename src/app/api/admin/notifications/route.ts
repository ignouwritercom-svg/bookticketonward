import { staffSession } from "@/lib/admin";
import { failure, json, readBody } from "@/lib/api";
import { uuidPattern } from "@/lib/account";
export async function POST(request: Request) {
  try {
    const body = await readBody(request) as { id?: string; requestId?: string; acknowledgeDuplicate?: boolean };
    const { client, user, allowed } = await staffSession();
    if (!client || !user || !allowed) return failure("Staff access required.", 403);
    if (typeof body.id !== "string" || !uuidPattern.test(body.id) || typeof body.requestId !== "string" || !uuidPattern.test(body.requestId) || typeof body.acknowledgeDuplicate !== "boolean") return failure("Invalid retry request.");
    const { error } = await client.rpc("retry_order_notification", { p_id: body.id, p_request: body.requestId, p_acknowledge_duplicate: body.acknowledgeDuplicate });
    if (error) return failure("Retry unavailable. Refresh and check status, review window and attempt limit.", 409);
    return json({ ok: true });
  } catch { return failure("Unable to retry notification.", 403); }
}
