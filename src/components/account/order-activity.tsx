import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { notificationLabels, type OrderNotification } from "@/lib/notifications";
import { NotificationAction } from "./notification-action";

export async function OrderActivity({ client, userId, orderId, page = 1, compact = false }: { client: SupabaseClient; userId: string; orderId?: string; page?: number; compact?: boolean }) {
  const limit = compact ? 5 : 20;
  let query = client.from("order_notifications").select("id,order_id,event,created_at,read_at").eq("owner_id", userId).order("created_at", { ascending: false }).order("id").range((page - 1) * limit, page * limit);
  if (orderId) query = query.eq("order_id", orderId);
  const { data, error } = await query;
  return <section className="order-activity" aria-labelledby="order-activity-title"><h2 id="order-activity-title">Account activity</h2>
    <p>Account updates may go to your verified sign-in email. This is separate from your chosen email or WhatsApp document delivery. These are historical events; check the current order status and available documents.</p>
    {error ? <p role="status">Activity is temporarily unavailable. Your orders and current document access are unchanged.</p> : <>
      {!data?.length && <p>No account activity on this page.</p>}
      <ul className="notification-list">{(data as OrderNotification[]).slice(0, limit).map(item => <li className="account-card" key={item.id}>
        <header><h3>{notificationLabels[item.event]}</h3><span className="account-status">{item.read_at ? "Read in account" : "Unread"}</span></header>
        <p><time dateTime={item.created_at}>{new Date(item.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</time></p>
        {item.event === "document_withdrawn" && <p>This document was withdrawn. It cannot be downloaded; check your order for any replacement.</p>}
        {item.event === "booking_saved" && <p>Saving the order did not confirm payment or start fulfilment.</p>}
        <Link className="text-link" href={`/account/orders/${item.order_id}`} prefetch={false}>View current order</Link>
        {!item.read_at && <NotificationAction id={item.id} />}
      </li>)}</ul>
      {!compact && !orderId && <nav className="account-actions" aria-label="Activity pages">{page > 1 && <Link href={`/account/notifications?page=${page - 1}`} prefetch={false}>Previous page</Link>}{data.length > limit && <Link href={`/account/notifications?page=${page + 1}`} prefetch={false}>Next page</Link>}</nav>}
    </>}
    {(compact || orderId) && <Link className="text-link" href="/account/notifications" prefetch={false}>View all account activity</Link>}
  </section>;
}
