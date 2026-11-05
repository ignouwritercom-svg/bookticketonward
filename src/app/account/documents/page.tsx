import { Suspense } from "react";
import { accountPage } from "@/lib/account-page";
import { workspacePage } from "@/lib/workspace-server";
import { workspaceQuery } from "@/lib/workspace";
import { AccountUnavailable } from "@/components/account/auth";
import { WorkspaceHeader } from "@/components/account/workspace-ui";
import { WorkspaceExplorer } from "@/components/account/workspace-explorer";
export const metadata = { title: "My Documents | DummyTicket" };
async function Documents() {
  const { client, user } = await accountPage("/account/documents");
  if (!client || !user) return <><h1>My Documents</h1><AccountUnavailable /></>;
  const initial = await workspacePage(client, user.id, workspaceQuery.parse({ view: "documents" })).catch(() => null);
  return <><WorkspaceHeader title="My Documents" intro="Your published dummy flight tickets and dummy hotel booking PDFs, organised by order." /><p className="desk-notice">Only published, non-withdrawn versions from your paid orders appear here. Check the order reference and version before using a document.</p><WorkspaceExplorer view="documents" initial={initial} initialError={!initial} /></>;
}
export default function Page() { return <Suspense fallback={<p role="status">Loading your private document library…</p>}><Documents /></Suspense>; }
