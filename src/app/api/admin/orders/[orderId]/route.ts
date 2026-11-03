import { z } from "zod";
import { staffSession } from "@/lib/admin";
import { failure, json, readBody } from "@/lib/api";
import { uuidPattern } from "@/lib/account";

const actionSchema = z.object({
  action: z.enum(["start", "note", "publish", "withdraw", "deliver_email", "deliver_whatsapp"]),
  documentId: z.string().uuid().optional(),
  note: z.string().trim().min(1).max(2000).optional(),
});
export async function POST(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  let body: unknown;
  try { body = await readBody(request); } catch { return failure("Invalid request.", 403); }
  try {
    const { client, user, allowed } = await staffSession();
    if (!client || !user || !allowed) return failure("Staff access required.", 403);
    const { orderId } = await params;
    const parsed = actionSchema.safeParse(body);
    if (!uuidPattern.test(orderId) || !parsed.success) return failure("Check the action and try again.");
    const { action, documentId, note } = parsed.data;
    if ((action === "note" && !note) || (!["note", "start"].includes(action) && !documentId))
      return failure("Required details are missing.");
    const { error } = await client.rpc("admin_order_action", {
      p_order_id: orderId, p_action: action, p_document_id: documentId ?? null, p_note: note ?? null,
    });
    if (error) return failure("Action unavailable. Check payment, document state and staff access, then refresh.", 409);
    return json({ ok: true });
  } catch { return failure("Unable to update this order. Please retry.", 503); }
}
