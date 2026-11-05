import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ShieldCheck, ArrowUpRight } from "lucide-react";
import { AccountNavigation } from "@/components/account/workspace-nav";
import "./account.css";
export const metadata: Metadata = {
  title: "Your Account | DummyTicket",
  robots: { index: false, follow: false },
};
export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <main id="main-content" tabIndex={-1} className="account-page account-workspace"><div className="desk-shell"><aside className="desk-sidebar"><div className="desk-sidebar-title"><span><ShieldCheck size={22} aria-hidden="true" /></span><div><strong>My travel desk</strong><p>Your private account</p></div></div><Suspense fallback={<p role="status">Loading account navigation…</p>}><AccountNavigation /></Suspense><div className="desk-sidebar-help"><p>A new trip in mind?</p><Link className="text-link" href="/book">Start a request<ArrowUpRight size={16} aria-hidden="true" /></Link></div></aside><div className="desk-content"><noscript><p className="desk-notice">Enable JavaScript to view your account details and use sign-in, filters and account actions. <Link className="text-link" href="/contact">Booking help</Link> remains available.</p></noscript>{children}</div></div></main>
    </>
  );
}
