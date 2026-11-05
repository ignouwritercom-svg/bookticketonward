import { Suspense } from "react";
import { accountPage } from "@/lib/account-page";
import { workspacePage } from "@/lib/workspace-server";
import { workspaceQuery } from "@/lib/workspace";
import { AccountUnavailable } from "@/components/account/auth";
import { WorkspaceHeader } from "@/components/account/workspace-ui";
import { WorkspaceExplorer } from "@/components/account/workspace-explorer";
export const metadata = { title: "Saved Drafts | DummyTicket" };
async function Drafts() {
  const { client, user } = await accountPage("/account/drafts");
  if (!client || !user) return <><h1>Saved Drafts</h1><AccountUnavailable /></>;
  const initial = await workspacePage(client, user.id, workspaceQuery.parse({ view: "drafts" })).catch(() => null);
  return <><WorkspaceHeader title="Saved Drafts" intro="Pick up a reviewed request, update your travel details and continue when you are ready." /><p className="desk-notice">Drafts are editable until submitted as an order. Resuming a draft does not confirm a reservation or charge you.</p><WorkspaceExplorer view="drafts" initial={initial} initialError={!initial} /></>;
}
export default function Page() { return <Suspense fallback={<p role="status">Loading your private saved drafts…</p>}><Drafts /></Suspense>; }
