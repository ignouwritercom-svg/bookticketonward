import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminLocation, AdminNavigation } from "@/components/admin/navigation";
import { AdminNoScriptNavigation } from "@/components/admin/workspace";
import "../account/account.css";
import "./admin.css";
export const metadata: Metadata = { title: "Staff desk | DummyTicket", robots: { index: false, follow: false } };
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <main id="main-content" tabIndex={-1} className="account-page admin-page">
    <AdminNoScriptNavigation />
    <div className="ops-shell"><Suspense fallback={<p className="ops-nav-loading" role="status">Loading staff navigation…</p>}><AdminNavigation /></Suspense><div className="ops-content"><Suspense fallback={null}><AdminLocation /></Suspense><noscript><p className="ops-notice">Enable JavaScript to view private staff records and use management actions. Public website content remains available.</p></noscript>{children}</div></div>
  </main>;
}
