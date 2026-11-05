import { Suspense } from "react";
import Link from "next/link";
import { Settings2, Tags, ScrollText, ShieldCheck, Server } from "lucide-react";
import { staffPage } from "@/lib/admin";
import { confirmStaff, editorPath } from "@/lib/admin-workspace";
import { siteManagementEnabled } from "@/lib/site-content";
import { documentStorage } from "@/lib/document-storage";
import { AdminDenied } from "@/components/admin/access";
import { AdminHeader, ManagementSetup } from "@/components/admin/workspace";
async function Settings() {
  const { client, allowed, error } = await staffPage("/admin/settings");
  if (!client || !allowed) return <AdminDenied unavailable={!client || error} />;
  const status = await client.rpc("admin_site_list");
  if (!await confirmStaff(client)) return <AdminDenied />;
  return <><AdminHeader title="Business Settings" intro="Manage approved website information, service fees and booking acceptance text. Technical secrets stay on the server." />{status.error && <ManagementSetup />}<div className="ops-library">{[{ key: "settings:site", icon: Settings2, title: "Website and support", text: "Homepage heading, support email/WhatsApp, working hours and delivery targets." }, { key: "pricing:catalog", icon: Tags, title: "Service pricing", text: "Flight, hotel and combo fees in INR, published atomically to the booking catalog." }, { key: "policies:booking", icon: ScrollText, title: "Booking acceptance policies", text: "Versioned acceptance text for future flight, hotel and combo orders." }].map(({ key, icon: Icon, title, text }) => <article className="ops-library-card" key={key}><Icon size={25} aria-hidden="true" /><h2>{title}</h2><p>{text}</p><Link className="text-link" href={editorPath(key)} prefetch={false}>Open settings →</Link></article>)}</div><section className="ops-editor"><h2><Server size={22} aria-hidden="true" /> Configuration status</h2><dl className="ops-health"><div><dt>Management migration</dt><dd>{status.error ? "Unavailable / check setup" : "Available"}</dd></div><div><dt>Website management</dt><dd>{siteManagementEnabled() ? "Enabled" : "Not enabled"}</dd></div><div><dt>Private document transport</dt><dd>{documentStorage() ? "Configured" : "Missing configuration"}</dd></div><div><dt>Payment gateway</dt><dd>On hold · no manual paid action</dd></div><div><dt>Staff access</dt><dd>Existing verified staff accounts only</dd></div></dl><p className="ops-field-hint">Configured does not prove connectivity or that the email worker is running. Notification results are visible in its operations log. No key, password or environment value is shown here.</p></section><section className="ops-notice"><ShieldCheck size={22} aria-hidden="true" /><p>Save → review → publish is required. Restoring a revision creates a draft. Public terms, privacy and refund pages are edited in <Link href="/admin/content" className="text-link">Website Content</Link>; existing customer acceptance records are immutable. Payments, database roles, gateway credentials and server secrets cannot be switched on through these editors.</p></section></>;
}
export default function Page() { return <Suspense fallback={<p role="status">Loading protected settings…</p>}><Settings /></Suspense>; }
