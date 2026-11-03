import Link from "next/link";
import { NotificationAction } from "@/components/account/notification-action";
import { notificationLabels, notificationErrors, type NotificationJob } from "@/lib/notifications";
export function NotificationJobCard({ job }: { job: NotificationJob }) {
  return <article className="account-card notification-job"><header><h2>{notificationLabels[job.event]}</h2><span className="account-status">{job.status === "sent" ? "Sent — SMTP accepted" : job.status === "captured" ? "Captured locally — not emailed" : job.status}</span></header>
    <Link className="text-link" href={`/admin/orders/${job.order_id}`} prefetch={false}>{job.reference}</Link>
    <p>Channel: {job.channel} · Attempts: {job.attempts}/{job.attempt_limit}</p>
    <p>Created: {new Date(job.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST · Updated: {new Date(job.updated_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</p>
    {job.status === "queued" && <p>Next attempt after: {new Date(job.available_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</p>}
    {job.status === "sending" && job.lease_until && <p>Worker lease expires: {new Date(job.lease_until).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST. An overdue lease needs worker recovery and delivery review.</p>}
    {job.accepted_at && <p>SMTP accepted: {new Date(job.accepted_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST. Receipt and reading are unknown.</p>}
    {job.error_code && <p>{notificationErrors[job.error_code] ?? "Delivery unavailable; review setup."}</p>}
    <details><summary>Attempt history</summary><ul>{job.history.map(attempt => <li key={attempt.attempt}>Attempt {attempt.attempt}: {attempt.outcome} · {new Date(attempt.started_at).toISOString()}{attempt.finished_at ? ` — ${new Date(attempt.finished_at).toISOString()}` : " — awaiting result"}</li>)}</ul></details>
    {job.status === "failed" && job.attempts < 10 && <NotificationAction id={job.id} retry ambiguous={job.ambiguous} />}
  </article>;
}
