import Link from "next/link";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
import { LogoutButton } from "@/components/account/auth";
import { adminGroups } from "@/lib/admin-navigation";
export function AdminNoScriptNavigation() {
  return <noscript><details className="ops-static-nav"><summary>Admin navigation</summary><nav aria-label="Staff navigation without JavaScript"><ul>{adminGroups.flatMap(group => group.items).map(item => <li key={item.href}><a href={item.href}>{item.label}</a></li>)}</ul></nav></details></noscript>;
}
export function AdminHeader({ title, intro }: { title: string; intro: string }) {
  return <header className="ops-heading"><div><p className="eyebrow">Business operations</p><h1>{title}</h1><p>{intro}</p></div><div className="ops-heading-actions"><Link className="text-link" href="/" prefetch={false}>View website<ArrowUpRight size={16} aria-hidden="true" /></Link><LogoutButton /></div></header>;
}
export function ManagementSetup() {
  return <section className="account-card ops-setup"><ShieldCheck size={26} aria-hidden="true" /><h2>One-time management setup</h2><p>Order operations remain available. Website editing requires the additive management migration before its first use.</p><ol><li>Review and manually apply <code>supabase/migrations/202611050001_admin_site_management.sql</code> after the four existing migrations.</li><li>Set the server environment variable <code>SITE_MANAGEMENT_ENABLED=true</code> and rebuild/restart the application.</li><li>Return here to save drafts, preview and publish. Existing staff access is used.</li></ol><p>No migration is run by this screen. Do not rerun older migrations. Server secrets and payment settings stay outside the content editor.</p></section>;
}
