import { Suspense } from "react";
import { staffPage } from "@/lib/admin";
import { AdminDenied } from "@/components/admin/access";
import { AdminHeader } from "@/components/admin/workspace";
import { NewContent } from "@/components/admin/new-content";
async function Create() {
  const { client, allowed, error } = await staffPage("/admin/content/new");
  if (!client || !allowed) return <AdminDenied unavailable={!client || error} />;
  return <><AdminHeader title="New Content" intro="Create one useful, reviewed article at a time. Official sources are required for destination guidance." /><NewContent /></>;
}
export default function Page() { return <Suspense fallback={<p role="status">Checking staff access…</p>}><Create /></Suspense>; }
