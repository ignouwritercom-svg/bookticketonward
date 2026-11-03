import { z } from "zod";
import { createClient, verifiedCustomer } from "@/lib/supabase/server";
import { supabaseConfig } from "@/lib/supabase/config";
import { failure, json, readBody, unavailable } from "@/lib/api";

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

export async function POST(
  request: Request,
  context: { params: Promise<{ action: string }> },
) {
  let body: unknown;
  try {
    body = await readBody(request);
  } catch {
    return failure("Invalid request.", 403);
  }
  const { action } = await context.params;
  if (!["send", "verify", "logout"].includes(action))
    return failure("Not found.", 404);
  try {
    const client = await createClient();
    const config = supabaseConfig();
    if (!client || !config) return unavailable();
    if (action === "logout") {
      const { error } = await client.auth.signOut({ scope: "local" });
      return error
        ? failure("Unable to sign out. Please retry.", 503)
        : json({ ok: true });
    }
    const parsed = z
      .object({
        email: z.string().trim().email().max(254),
        token: z.string().optional(),
      })
      .safeParse(body);
    if (!parsed.success) return failure("Enter a valid email address.");
    if (action === "send") {
      const { error } = await client.auth.signInWithOtp({
        email: parsed.data.email,
        options: { shouldCreateUser: true },
      });
      if (error?.status === 429 || error?.code?.includes("rate_limit"))
        return failure(
          "Too many code requests. Wait at least 60 seconds; your email provider may require a longer wait.",
          429,
        );
      if (error)
        return failure(
          "A code could not be sent. Please try later or check the email service setup.",
          503,
        );
      return json({ ok: true });
    }
    if (!new RegExp(`^\\d{${config.otpLength}}$`).test(parsed.data.token || ""))
      return failure(`Enter the ${config.otpLength}-digit code.`);
    const { error } = await client.auth.verifyOtp({
      email: parsed.data.email,
      token: parsed.data.token!,
      type: "email",
    });
    if (error?.status === 429)
      return failure(
        "Too many attempts. Please wait before trying again.",
        429,
      );
    if (error)
      return failure(
        "That code is incorrect or has expired. Try again or request a new code.",
      );
    const { data } = await client.auth.getUser();
    if (!data.user?.email_confirmed_at || !data.user.email)
      return failure("Unable to verify this session. Please retry.", 401);
    return json({ user: { id: data.user.id, email: data.user.email } });
  } catch {
    return failure("Account services could not be reached. Please retry.", 503);
  }
}
