import { Suspense } from "react";
import Link from "next/link";
import { staffPage } from "@/lib/admin";
import { AdminDenied } from "@/components/admin/access";
import { NotificationJobCard } from "@/components/admin/notification-job";
import type { NotificationJob } from "@/lib/notifications";
export const metadata = { title: "Notification operations | DummyTicket", robots: { index: false, follow: false } };
async function Log({ searchParams }: { searchParams: Promise<{ page?: string; failed?: string }> }) {
  const { client, allowed, error } = await staffPage("/admin/notifications");
  if (!client || !allowed) return <AdminDenied unavailable={!client || error} />;
  const params = await searchParams;
  const page = /^\d{1,4}$/.test(params.page ?? "") ? Math.max(1, Number(params.page)) : 1;
  const failed = params.failed === "true";
  const result = await client.rpc("admin_notification_log", { p_page: page, p_failed: failed });
  const fresh = await client.rpc("is_booking_staff");
  if (fresh.error || fresh.data !== true) return <AdminDenied />;
  const jobs = (result.data?.jobs ?? []) as NotificationJob[];
  return <><h1>Notification operations</h1><p>Email status is separate from payment, document publication and manual delivery. “Sent” means SMTP accepted the email, not that it was received or read.</p>
    <nav className="account-actions" aria-label="Notification filters"><Link href="/admin/notifications" prefetch={false}>All notifications</Link><Link href="/admin/notifications?failed=true" prefetch={false}>Failed notifications</Link><Link href="/admin/orders?payment=paid&fulfilment=not_started" prefetch={false}>Paid orders awaiting action</Link></nav>
    {result.error ? <p role="alert">Notification log unavailable. Check notification setup and retry.</p> : <><p>{result.data.failed_count} failed notification(s) need review.</p>
      {!jobs.length && <div className="account-empty">No notifications in this view.</div>}
      {jobs.slice(0,20).map(job => <NotificationJobCard key={job.id} job={job} />)}
      <nav className="account-actions" aria-label="Notification pages">{page > 1 && <Link href={`/admin/notifications?page=${page-1}&failed=${failed}`} prefetch={false}>Previous page</Link>}{jobs.length > 20 && <Link href={`/admin/notifications?page=${page+1}&failed=${failed}`} prefetch={false}>Next page</Link>}</nav>
    </>}
  </>;
}
export default function Page(props: { searchParams: Promise<{ page?: string; failed?: string }> }) { return <Suspense fallback={<p role="status">Loading protected notification log…</p>}><Log {...props} /></Suspense>; }
