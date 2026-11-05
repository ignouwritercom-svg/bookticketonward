import { Suspense } from "react";
import Link from "next/link";
import { ShieldCheck, Mail, LogOut, LockKeyhole } from "lucide-react";
import { accountPage } from "@/lib/account-page";
import { AccountUnavailable, LogoutButton } from "@/components/account/auth";
import { WorkspaceHeader } from "@/components/account/workspace-ui";
export const metadata = { title: "Account and Security | DummyTicket" };
async function Settings() {
  const { client, user } = await accountPage("/account/settings");
  if (!client || !user) return <><h1>Account and Security</h1><AccountUnavailable /></>;
  return <><WorkspaceHeader title="Account and Security" intro="Your verified sign-in identity and the information attached to your bookings." /><section className="desk-account-identity"><span className="desk-service-icon"><ShieldCheck size={25} aria-hidden="true" /></span><div><span className="desk-badge desk-badge-good">Verified account</span><h2>Your sign-in email</h2><p>{user.email}</p><p className="desk-record-date">Email verification is required before saving bookings and accessing your private documents.</p></div></section><div className="desk-help-grid"><section className="desk-help-card"><Mail size={23} aria-hidden="true" /><h2>Booking contacts</h2><p>Your account email identifies your bookings. Email or WhatsApp document delivery is chosen separately for each request.</p><Link className="text-link" href="/account/drafts">Review contacts in a saved draft →</Link></section><section className="desk-help-card"><LockKeyhole size={23} aria-hidden="true" /><h2>Private information</h2><p>Traveller details belong to their booking. You do not need to upload a passport scan or provide a passport number here.</p><Link className="text-link" href="/privacy">Read the privacy notice →</Link></section><section className="desk-help-card"><LogOut size={23} aria-hidden="true" /><h2>Using a shared device?</h2><p>Sign out when you finish. Keep downloaded documents in a secure place and never share your email verification code.</p><LogoutButton /></section></div></>;
}
export default function Page() { return <Suspense fallback={<p role="status">Loading your private account…</p>}><Settings /></Suspense>; }
