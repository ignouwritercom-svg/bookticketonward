import { Suspense } from "react";
import Link from "next/link";
import { FilePenLine, Files, ShieldCheck, CircleHelp } from "lucide-react";
import { accountPage } from "@/lib/account-page";
import { AccountUnavailable } from "@/components/account/auth";
import { WorkspaceHeader } from "@/components/account/workspace-ui";
export const metadata = { title: "Account Help | DummyTicket" };
async function Help() {
  const { client, user } = await accountPage("/account/help");
  if (!client || !user) return <><h1>Account Help</h1><AccountUnavailable /></>;
  const topics = [{ icon: FilePenLine, title: "Change a saved request", text: "Open an unsubmitted draft to edit travel, traveller or delivery details. An existing order keeps the details you accepted when it was created.", href: "/account/drafts", action: "Open saved drafts" }, { icon: Files, title: "Find a PDF", text: "Check My Documents or open the relevant order. PDFs require verified payment and publication. A withdrawn version cannot be downloaded.", href: "/account/documents", action: "Open document library" }, { icon: ShieldCheck, title: "Missing an order?", text: "Make sure you are signed in with the same verified email used to save the request. Unsaved bookings cannot be recovered after leaving the form.", href: "/account/settings", action: "Check your account" }, { icon: CircleHelp, title: "Understand an order status", text: "Payment and preparation are separate. An unpaid order stays out of preparation. Account activity is historical; the order shows the current status.", href: "/account/orders", action: "Check your orders" }];
  return <><WorkspaceHeader title="Account Help" intro="Find the right next step for your draft, order or document." /><div className="desk-help-grid">{topics.map(({ icon: Icon, title, text, href, action }) => <section className="desk-help-card" key={title}><Icon size={24} aria-hidden="true" /><h2>{title}</h2><p>{text}</p><Link className="text-link" href={href} prefetch={false}>{action} →</Link></section>)}</div><section className="desk-help-footer"><h2>Need more guidance?</h2><p>For questions about a submitted order, keep its reference handy. Never include an OTP, passport scan or payment credentials when seeking help.</p><div className="account-actions"><Link className="button button-secondary" href="/contact">Booking help</Link><Link className="text-link" href="/faq">Read FAQs →</Link></div></section></>;
}
export default function Page() { return <Suspense fallback={<p role="status">Loading your account help…</p>}><Help /></Suspense>; }
