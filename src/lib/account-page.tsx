import "server-only";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { verifiedCustomer } from "./supabase/server";
import { safeReturnPath } from "./account";

export async function accountPage(destination: string) {
  await connection();
  const result = await verifiedCustomer();
  if (result.client && !result.user)
    redirect(`/login?next=${encodeURIComponent(safeReturnPath(destination))}`);
  return result;
}
