import { Suspense } from "react";
import { accountPage } from "@/lib/account-page";
import { workspaceCounts, workspacePage } from "@/lib/workspace-server";
import { workspaceQuery } from "@/lib/workspace";
import { AccountUnavailable } from "@/components/account/auth";
import { WorkspaceHeader, WorkspaceOverview } from "@/components/account/workspace-ui";
import { OrderActivity } from "@/components/account/order-activity";
export const metadata = { title: "Account Overview | DummyTicket" };
async function Overview() {
  const { client, user } = await accountPage("/account");
  if (!client || !user) return <><h1>Account Overview</h1><AccountUnavailable /></>;
  const [counts, orders, drafts] = await Promise.all([workspaceCounts(client, user.id), workspacePage(client, user.id, workspaceQuery.parse({ view: "orders" })).catch(() => null), workspacePage(client, user.id, workspaceQuery.parse({ view: "drafts" })).catch(() => null)]);
  return <><WorkspaceHeader title="Account Overview" intro="Your requests, documents and next steps, in one place." email={user.email} /><WorkspaceOverview counts={counts} orders={orders?.orders ?? []} drafts={drafts?.drafts ?? []} ordersError={!orders} draftsError={!drafts} /><OrderActivity client={client} userId={user.id} compact /></>;
}
export default function Page() { return <Suspense fallback={<p role="status">Loading your private travel desk…</p>}><Overview /></Suspense>; }
