import { Suspense } from "react";
import Link from "next/link";
import { accountPage } from "@/lib/account-page";
import { AccountUnavailable } from "@/components/account/auth";
import { OrderActivity } from "@/components/account/order-activity";
import { WorkspaceHeader } from "@/components/account/workspace-ui";
export const metadata = { title: "Account activity | DummyTicket", robots: { index: false, follow: false } };
async function Activity({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { client, user } = await accountPage("/account/notifications");
  if (!client || !user) return <><h1>Your Notifications</h1><AccountUnavailable /></>;
  const params = await searchParams;
  const page = /^\d{1,4}$/.test(params.page ?? "") ? Math.max(1, Number(params.page)) : 1;
  return <><WorkspaceHeader title="Your Notifications" intro="Follow account updates and mark the ones you have reviewed as read." /><Link className="text-link" href="/account/orders">All orders</Link><OrderActivity client={client} userId={user.id} page={page} /></>;
}
export default function Page(props: { searchParams: Promise<{ page?: string }> }) { return <Suspense fallback={<p role="status">Loading private activity…</p>}><Activity {...props} /></Suspense>; }
