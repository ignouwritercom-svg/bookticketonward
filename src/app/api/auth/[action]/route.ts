import { verifiedCustomer } from "@/lib/supabase/server";
import { supabaseConfig } from "@/lib/supabase/config";
import { failure, json } from "@/lib/api";
import { authPost } from "@/lib/auth-api";

export async function GET(
  _request: Request,
  context: { params: Promise<{ action: string }> },
) {
  if ((await context.params).action !== "session")
    return failure("Not found.", 404);
  try {
    const { client, user } = await verifiedCustomer();
    return json({
      configured: !!client,
      user: user ? { id: user.id, email: user.email } : null,
      otpLength: supabaseConfig()?.otpLength ?? 6,
    });
  } catch {
    return failure("Unable to check your session. Please retry.", 503);
  }
}

export async function POST(request: Request, context: { params: Promise<{ action: string }> }) {
  return authPost(request, context);
}
