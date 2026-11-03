import { Suspense } from "react";
import Link from "next/link";
import { accountPage } from "@/lib/account-page";
import { AccountUnavailable, LogoutButton } from "@/components/account/auth";
import { formatPrice, tripTypes, serviceLabels } from "@/config/business";
import { HotelSummary } from "@/components/booking/hotel-summary";
import { itinerarySectors } from "@/lib/booking";
import { formatTravelDate } from "@/lib/trip";
import type { Order, SavedDraft } from "@/lib/account";
import { paymentLabels, fulfilmentLabels } from "@/lib/documents";
import { OrderActivity } from "@/components/account/order-activity";

async function Orders() {
  const { client, user } = await accountPage("/account/orders");
  if (!client || !user) return <AccountUnavailable />;
  const [drafts, orders] = await Promise.all([
    client
      .from("booking_drafts")
      .select("id,data,revision,status,updated_at")
      .eq("owner_id", user.id)
      .eq("status", "draft")
      .order("updated_at", { ascending: false }),
    client
      .from("orders")
      .select(
        "id,reference,created_at,booking_snapshot,total_minor,currency,payment_status,fulfilment_status",
      )
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false }),
  ]);
  return (
    <>
      <div className="account-heading">
        <div>
          <p className="eyebrow">YOUR TRAVEL DESK</p>
          <h1>
            My orders<span>.</span>
          </h1>
          <p className="account-private-note">Signed in as {user.email}</p>
        </div>
        <LogoutButton />
      </div>
      {drafts.error || orders.error ? (
        <div className="account-empty" role="alert">
          <h2>We couldn’t load your bookings</h2>
          <p>
            Please refresh to retry. If this continues, check that the Supabase
            migration has been applied.
          </p>
        </div>
      ) : (
        <>
          <section aria-labelledby="saved-drafts">
            <h2 id="saved-drafts">Saved drafts</h2>
            {!drafts.data.length && (
              <div className="account-empty">
                <p>
                  No saved drafts yet. Complete a booking and verify your email
                  to save it here.
                </p>
                <Link className="text-link" href="/book">
                  Start a booking
                </Link>
              </div>
            )}
            {(drafts.data as SavedDraft[]).map((draft) => (
              <article className="account-card" key={draft.id}>
                <header>
                  <h3>
                    {draft.data.service && draft.data.service!=="flight" ? serviceLabels[draft.data.service] :
                      tripTypes.find(
                        (trip) => trip.value === draft.data.trip.type,
                      )?.label
                    }{" "}
                    booking
                  </h3>
                  <span className="account-muted">
                    Draft · revision {draft.revision}
                  </span>
                </header>
                <p>
                  Updated{" "}
                  {new Date(draft.updated_at).toLocaleString("en-IN", {
                    timeZone: "Asia/Kolkata",
                  })}
                </p>
                {draft.data.service!=="hotel" && <ol>
                  {itinerarySectors(draft.data.trip).map((sector, index) => (
                    <li key={index}>
                      {sector.from} → {sector.to} ·{" "}
                      {formatTravelDate(sector.departure)}
                    </li>
                  ))}
                </ol>}
                {draft.data.service && draft.data.service!=="flight" && <HotelSummary hotels={draft.data.hotels ?? []} />}
                <p>{draft.data.passengers.length} passenger(s)</p>
                <Link
                  className="button button-secondary"
                  href={`/book?draft=${draft.id}`}
                  prefetch={false}
                >
                  Resume saved draft
                </Link>
              </article>
            ))}
          </section>
          <section aria-labelledby="order-history">
            <h2 id="order-history">Order history</h2>
            {!orders.data.length && (
              <div className="account-empty">
                <p>
                  No orders yet. Saving a draft lets you review it before
                  creating an unpaid order.
                </p>
              </div>
            )}
            {(orders.data as Order[]).map((order) => (
              <article className="account-card" key={order.id}>
                <header>
                  <h3>
                    <Link href={`/account/orders/${order.id}`} prefetch={false}>
                      {order.reference}
                    </Link>
                  </h3>
                  <span className="account-status">{paymentLabels[order.payment_status]}</span>
                </header>
                <p>
                  {new Date(order.created_at).toLocaleDateString("en-IN", {
                    timeZone: "Asia/Kolkata",
                  })}{" "}
                  ·{" "}
                  {order.booking_snapshot.service && order.booking_snapshot.service!=="flight" ? serviceLabels[order.booking_snapshot.service] :
                    tripTypes.find(
                      (trip) => trip.value === order.booking_snapshot.trip.type,
                    )?.label
                  }
                </p>
                {order.booking_snapshot.service!=="hotel" && <ol>
                  {itinerarySectors(order.booking_snapshot.trip).map(
                    (sector, index) => (
                      <li key={index}>
                        {sector.from} → {sector.to} ·{" "}
                        {formatTravelDate(sector.departure)}
                      </li>
                    ),
                  )}
                </ol>}
                {order.booking_snapshot.service && order.booking_snapshot.service!=="flight" && <HotelSummary hotels={order.booking_snapshot.hotels ?? []} />}
                <p>
                  <strong>
                    {formatPrice(order.total_minor)} {order.currency}
                  </strong>{" "}
                  · Fulfilment: {fulfilmentLabels[order.fulfilment_status]}
                </p>
                <Link
                  href={`/account/orders/${order.id}`}
                  className="text-link"
                  prefetch={false}
                >
                  View order details
                </Link>
              </article>
            ))}
          </section>
        </>
      )}
      <p className="account-private-note">
        Payments are not enabled yet. Unpaid orders do not enter the fulfilment
        queue.
      </p>
      <OrderActivity client={client} userId={user.id} compact />
    </>
  );
}
export default function OrdersPage() {
  return (
    <Suspense fallback={<p role="status">Loading your private bookings…</p>}>
      <Orders />
    </Suspense>
  );
}
