import { formatPrice, tripTypes, serviceLabels } from "@/config/business";
import { HotelSummary } from "@/components/booking/hotel-summary";
import { itinerarySectors } from "@/lib/booking";
import { formatTravelDate } from "@/lib/trip";
import type { Order } from "@/lib/account";
import { paymentLabels, fulfilmentLabels, documentKindLabels, type OrderDocument } from "@/lib/documents";
import { OrderProgress } from "./order-progress";

export function OrderDetails({ order, documents = [], documentsError = false, showDocuments = true, staffView = false }: { order: Order; documents?: OrderDocument[]; documentsError?: boolean; showDocuments?: boolean; staffView?: boolean }) {
  const booking = order.booking_snapshot;
  const contact = booking.communication;
  const service=booking.service ?? "flight";
  return (
    <>
      <section className="account-card">
        <header>
          <div>
            <p className="eyebrow">{staffView ? "Customer order" : "Your order"}</p>
            <h1>{order.reference}</h1>
            <p>
              Created{" "}
              {new Date(order.created_at).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
                timeZone: "Asia/Kolkata",
              })}
            </p>
          </div>
          <span className="account-status">{paymentLabels[order.payment_status]}</span>
        </header>
        <dl>
          <div><dt>Service</dt><dd>{serviceLabels[service]}</dd></div>
          <div>
            <dt>Service total</dt>
            <dd className="account-total">
              {formatPrice(order.total_minor)} {order.currency}
            </dd>
          </div>
          <div>
            <dt>Price per passenger</dt>
            <dd>
              {formatPrice(order.unit_price_minor)} × {order.passenger_count}
            </dd>
          </div>
          <div>
            <dt>Payment status</dt>
            <dd>{paymentLabels[order.payment_status]}</dd>
          </div>
          <div>
            <dt>Fulfilment status</dt>
            <dd>{fulfilmentLabels[order.fulfilment_status]}</dd>
          </div>
        </dl>
        {order.payment_status === "awaiting_payment" && <p>
          Online payments are currently unavailable. Your order has been saved;
          no reservation has been issued and document preparation has not started.
        </p>}
      </section>
      {!staffView && <OrderProgress order={order} />}
      {service!=="hotel" && <section className="account-card">
        <h2>Your itinerary</h2>
        <p>
          {tripTypes.find((trip) => trip.value === booking.trip.type)?.label}
        </p>
        <ol>
          {itinerarySectors(booking.trip).map((sector, index) => (
            <li key={index}>
              <strong>
                {sector.from} → {sector.to}
              </strong>
              <br />
              {formatTravelDate(sector.departure)}
            </li>
          ))}
        </ol>
      </section>}
      {service!=="flight" && <section className="account-card"><h2>Hotel stays</h2><HotelSummary hotels={booking.hotels ?? []} /><p>Reservation service only. Hotel accommodation is not paid by this fee.</p></section>}
      <section className="account-card">
        <h2>Passengers</h2>
        {booking.passengers.map((passenger, index) => (
          <div key={index}>
            <h3>
              {index + 1}. {passenger.givenNames}
              {!passenger.singleName && ` ${passenger.surname}`}
            </h3>
            <dl>
              <div>
                <dt>Date of birth</dt>
                <dd>{formatTravelDate(passenger.dob)}</dd>
              </div>
              <div>
                <dt>Sex on document</dt>
                <dd>{passenger.sex}</dd>
              </div>
              <div>
                <dt>Nationality</dt>
                <dd>{passenger.nationality || "Not provided"}</dd>
              </div>
              <div>
                <dt>Name format</dt>
                <dd>
                  {passenger.singleName
                    ? "Single name; no surname"
                    : "Given names and surname"}
                </dd>
              </div>
            </dl>
          </div>
        ))}
      </section>
      <section className="account-card">
        <h2>Communication & delivery</h2>
        <dl>
          <div>
            <dt>Account email</dt>
            <dd>{contact.accountEmail}</dd>
          </div>
          <div>
            <dt>Preferred delivery</dt>
            <dd>
              {contact.channel === "whatsapp"
                ? `WhatsApp · ${contact.whatsapp}`
                : `Email · ${contact.accountEmail}`}
            </dd>
          </div>
          <div>
            <dt>Alternate contact</dt>
            <dd>{contact.alternateContact || "Not provided"}</dd>
          </div>
          <div>
            <dt>Purpose</dt>
            <dd>{contact.purpose || "Not provided"}</dd>
          </div>
          <div>
            <dt>Appointment / submission</dt>
            <dd>
              {contact.appointmentDate
                ? formatTravelDate(contact.appointmentDate)
                : "Not provided"}
            </dd>
          </div>
          <div>
            <dt>Special instructions</dt>
            <dd>{contact.specialInstructions || "None provided"}</dd>
          </div>
        </dl>
      </section>
      {showDocuments && <section className={documents.length ? "account-card" : "account-empty"}>
        <h2>{documentsError ? "Documents temporarily unavailable" : documents.length ? "Your documents" : "No documents available yet"}</h2>
        {documentsError ? <p role="alert">We could not check your documents. Please refresh to retry.</p> : !documents.length ? <p>{order.payment_status === "paid" ? "Your documents will appear here after staff publishes them. A withdrawn version is no longer available." : "Documents become available only after verified payment and staff publication."}</p> : <ul>{documents.map(document => <li key={document.id}><strong>{documentKindLabels[document.kind ?? "flight"]}</strong><br /><a href={`/api/documents/${document.id}`} download>Download PDF · Version {document.version}</a><p>Published {new Date(document.published_at!).toLocaleString("en-IN", {timeZone:"Asia/Kolkata"})} IST</p></li>)}</ul>}
      </section>}
      <section className="account-card">
        <h2>Accepted service policy</h2>
        {staffView && <p className="account-muted">Version {order.policy_version}</p>}
        <p>{order.policy_snapshot}</p>
      </section>
    </>
  );
}
