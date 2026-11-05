import { Suspense } from "react";
import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { AdminLogin } from "@/components/admin/login";
import "../account/account.css";
import "./sign-in.css";

export const metadata: Metadata = {
  title: "Admin Sign-In | DummyTicket",
  description: "Secure sign-in for authorized DummyTicket administrators.",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return <main id="main-content" tabIndex={-1} className="account-page account-login staff-login">
    <div className="staff-login-mark"><ShieldCheck size={28} aria-hidden="true" /></div>
    <p className="eyebrow">Private staff access</p>
    <h1>Admin Sign-In</h1>
    <p>Manage reservations, documents and your website from the admin workspace.</p>
    <Suspense fallback={<p role="status">Loading admin sign-in…</p>}><AdminLogin /></Suspense>
    <p className="staff-login-note">Access is restricted to authorized admin accounts.</p>
    <noscript>Enable JavaScript to verify your admin email.</noscript>
  </main>;
}
