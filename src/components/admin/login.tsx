"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { accountRequest, safeAdminReturnPath } from "@/lib/account";
import { LogoutButton, OtpSignIn } from "@/components/account/auth";

type StaffSession = { configured: boolean; allowed: boolean; denied: boolean; otpLength: number };

export function AdminLogin() {
  const params = useSearchParams();
  const destination = safeAdminReturnPath(params.get("next"));
  const [session, setSession] = useState<StaffSession | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    accountRequest<StaffSession>("/api/staff-auth/session")
      .then(result => { if (active) { setSession(result); setError(""); } })
      .catch(() => { if (active) setError("Unable to check admin sign-in. Please try again."); });
    return () => { active = false; };
  }, [attempt]);
  if (error) return <div className="account-empty"><p role="alert">{error}</p><button type="button" className="button button-secondary" onClick={() => { setError(""); setSession(null); setAttempt(value => value + 1); }}>Try again</button></div>;
  if (!session) return <p role="status">Checking admin access…</p>;
  if (!session.configured) return <div className="account-empty" role="status"><h2>Admin sign-in is unavailable</h2><p>Please try again later. No account changes have been made.</p></div>;
  if (session.allowed) return <section className="auth-panel"><h2>Admin access verified</h2><p>Your account has active staff permission.</p><div className="account-actions"><Link className="button button-primary" href={destination} prefetch={false}>Open admin workspace</Link><LogoutButton returnTo="/admin-login" /></div></section>;
  if (session.denied) return <section className="account-empty"><h2>Staff Access Required</h2><p>This signed-in account does not have active staff access. Sign out to use your admin account.</p><div className="account-actions"><LogoutButton returnTo="/admin-login" /><Link className="text-link" href="/account/orders" prefetch={false}>Go to my orders</Link></div></section>;
  return <OtpSignIn staffOnly otpLength={session.otpLength} onVerified={() => {
    window.dispatchEvent(new Event("customer-session"));
    // Drop the previous identity's private Router Cache on account switching.
    window.location.assign(destination);
  }} />;
}
