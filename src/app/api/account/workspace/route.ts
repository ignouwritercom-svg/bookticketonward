import { verifiedCustomer } from "@/lib/supabase/server";
import { failure, json, readBody, sameOrigin, unavailable } from "@/lib/api";
import { workspaceQuery } from "@/lib/workspace";
import { workspacePage } from "@/lib/workspace-server";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return failure("Use your account on this website.", 403);
  let body: unknown;
  try { body = await readBody(request); } catch { return failure("Check your account filters.", 400); }
  const parsed = workspaceQuery.safeParse(body);
  if (!parsed.success) return failure("Check your account filters.", 400);
  try {
    const { client, user } = await verifiedCustomer();
    if (!client) return unavailable();
    if (!user) return failure("Your session has ended. Sign in again to view your account.", 401);
    return json(await workspacePage(client, user.id, parsed.data));
  } catch { return failure("We couldn’t load this part of your account. Please try again.", 503); }
}
