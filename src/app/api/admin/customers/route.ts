import { z } from "zod";
import { staffSession } from "@/lib/admin";
import { failure, json, readBody } from "@/lib/api";
import { confirmStaff } from "@/lib/admin-workspace";
const schema = z.object({ page: z.number().int().min(1).max(10000), query: z.string().trim().max(100).regex(/^[^\u0000-\u001f]*$/) }).strict();
export async function POST(request: Request) {
  let body: unknown;
  try { body = await readBody(request); } catch { return failure("Invalid customer lookup.", 403); }
  try {
    const { client, allowed } = await staffSession();
    if (!client || !allowed) return failure("Active staff access required.", 403);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return failure("Use a valid account email search.");
    const result = await client.rpc("admin_customer_directory", { p_page: parsed.data.page, p_query: parsed.data.query });
    if (!await confirmStaff(client)) return failure("Staff access has ended.", 403);
    if (result.error) return failure("Customer directory unavailable. Check management setup or retry.", 503);
    return json(result.data);
  } catch { return failure("Customer directory unavailable.", 503); }
}
