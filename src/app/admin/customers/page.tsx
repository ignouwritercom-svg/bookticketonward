import { Suspense } from "react";
import { staffPage } from "@/lib/admin";
import { confirmStaff } from "@/lib/admin-workspace";
import { AdminDenied } from "@/components/admin/access";
import { AdminHeader, ManagementSetup } from "@/components/admin/workspace";
import { Customers } from "@/components/admin/customers";
async function Directory() {
  const { client, allowed, error } = await staffPage("/admin/customers");
  if (!client || !allowed) return <AdminDenied unavailable={!client || error} />;
  const result = await client.rpc("admin_customer_directory", { p_page: 1, p_query: "" });
  if (!await confirmStaff(client)) return <AdminDenied />;
  return <><AdminHeader title="Customers" intro="Find submitted requests by verified account email and open the related orders." />{result.error ? <ManagementSetup /> : <Customers initial={result.data} />}<p className="ops-notice">Traveller and contact details remain on their individual orders. This directory does not change login identities, ban accounts or grant staff access.</p></>;
}
export default function Page() { return <Suspense fallback={<p role="status">Loading protected customer directory…</p>}><Directory /></Suspense>; }
