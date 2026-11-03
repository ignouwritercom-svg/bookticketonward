import Link from "next/link";
import type { Metadata } from "next";
import "../account/account.css";
import "./admin.css";
export const metadata: Metadata = { title: "Staff desk | DummyTicket", robots: { index: false, follow: false } };
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <main id="main-content" tabIndex={-1} className="account-page admin-page">
    <nav className="workspace-navigation" aria-label="Staff navigation"><span>Staff desk</span><Link href="/admin" prefetch={false}>Overview</Link><Link href="/admin/orders" prefetch={false}>Orders</Link><Link href="/admin/notifications" prefetch={false}>Notifications</Link><Link href="/account/orders" prefetch={false}>My account</Link></nav>
    {children}
  </main>;
}
