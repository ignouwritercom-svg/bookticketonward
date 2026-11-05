import { staffSession } from "@/lib/admin";
import { authPost } from "@/lib/auth-api";
import { failure, json } from "@/lib/api";
import { supabaseConfig } from "@/lib/supabase/config";

export async function GET(_request: Request, context: { params: Promise<{ action: string }> }) {
  if ((await context.params).action !== "session") return failure("Not found.", 404);
  try {
    const session = await staffSession();
    if (session.error) return failure("Unable to verify staff access. Please try again.", 503);
    return json({
      configured: !!session.client,
      allowed: session.allowed,
      denied: !!session.user && !session.allowed,
      otpLength: supabaseConfig()?.otpLength ?? 6,
    });
  } catch {
    return failure("Unable to check admin sign-in. Please try again.", 503);
  }
}

export async function POST(request: Request, context: { params: Promise<{ action: string }> }) {
  return authPost(request, context, true);
}
