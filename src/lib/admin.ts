import "server-only";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { verifiedCustomer } from "./supabase/server";
import { safeAdminReturnPath } from "./account";

export async function staffSession() {
  const session = await verifiedCustomer();
  if (!session.client || !session.user) return { ...session, allowed: false, error: false };
  const { data, error } = await session.client.rpc("is_booking_staff");
  return { ...session, allowed: !error && data === true, error: !!error };
}

export async function staffPage(destination: string) {
  await connection();
  const session = await staffSession();
  if (session.client && !session.user)
    redirect(`/admin-login?next=${encodeURIComponent(safeAdminReturnPath(destination))}`);
  return session;
}
