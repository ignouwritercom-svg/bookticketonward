import { Suspense } from "react";
import Link from "next/link";
import { accountPage } from "@/lib/account-page";
import { workspacePage } from "@/lib/workspace-server";
import { workspaceQuery } from "@/lib/workspace";
import { AccountUnavailable } from "@/components/account/auth";
import { WorkspaceHeader } from "@/components/account/workspace-ui";
import { WorkspaceExplorer } from "@/components/account/workspace-explorer";
export const metadata = { title: "My Orders | DummyTicket" };
async function Orders() {
  const { client, user } = await accountPage("/account/orders");
  if (!client || !user) return <><h1>My Orders</h1><AccountUnavailable /></>;
  const initial = await workspacePage(client, user.id, workspaceQuery.parse({ view: "orders" })).catch(() => null);
  return <><WorkspaceHeader title="My Orders" intro="Find a reservation request and follow its current payment and document status." /><div className="desk-context-links"><Link href="/account/drafts" prefetch={false}>Looking for an unfinished request? Open saved drafts →</Link></div><WorkspaceExplorer view="orders" initial={initial} initialError={!initial} /><p className="desk-notice">Online payments are currently unavailable. Unpaid orders do not enter preparation. A saved order is not a paid travel ticket or confirmation of accommodation.</p></>;
}
export default function OrdersPage() { return <Suspense fallback={<p role="status">Loading your private orders…</p>}><Orders /></Suspense>; }
