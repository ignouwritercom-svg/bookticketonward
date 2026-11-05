"use client";

import { useState } from "react";
import Link from "next/link";
import { business, formatPrice, getReservationQuote, tripTypes, type ServiceType, type TripType, type ServiceCatalog } from "@/config/business";

const estimateServices: Record<ServiceType, string> = {
  flight: "Dummy flight ticket",
  hotel: "Dummy hotel booking",
  combo: "Dummy flight + hotel",
};

export function FeeEstimator({ catalog = business }: { catalog?: ServiceCatalog }) {
  const [service, setService] = useState<ServiceType>("flight");
  const [trip, setTrip] = useState<TripType>("one-way");
  const [travellers, setTravellers] = useState(1);
  const [stays, setStays] = useState(1);
  const quote = getReservationQuote(trip, travellers, service, service === "flight" ? 0 : stays, catalog);
  const bookingHref = `/book?service=${service}${service === "hotel" ? "" : `&type=${trip}`}`;
  return <section className="fee-estimator" aria-labelledby="estimate-heading">
    <div className="estimate-controls"><p className="eyebrow">Plan your request</p><h2 id="estimate-heading">Know your service fee.</h2><p>Choose your documents and group size. No personal details needed.</p>
      <div className="estimate-fields">
        <div className="estimate-service"><label htmlFor="estimate-service">Document service</label><select id="estimate-service" value={service} onChange={event => setService(event.target.value as ServiceType)}>{Object.entries(estimateServices).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
        {service !== "hotel" && <div><label htmlFor="estimate-trip">Flight trip type</label><select id="estimate-trip" value={trip} onChange={event => setTrip(event.target.value as TripType)}>{tripTypes.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}</select></div>}
        <div><label htmlFor="estimate-travellers">Travellers</label><select id="estimate-travellers" value={travellers} onChange={event => setTravellers(Number(event.target.value))}>{Array.from({ length: business.maxPassengers }, (_, i) => i + 1).map(count => <option key={count} value={count}>{count} {count === 1 ? "traveller" : "travellers"}</option>)}</select></div>
        {service !== "flight" && <div><label htmlFor="estimate-stays">Hotel stays</label><select id="estimate-stays" value={stays} onChange={event => setStays(Number(event.target.value))} aria-describedby="estimate-stays-hint">{Array.from({ length: business.maxHotelStays }, (_, i) => i + 1).map(count => <option key={count} value={count}>{count} {count === 1 ? "stay" : "stays"}</option>)}</select><p id="estimate-stays-hint" className="estimate-hint">Each traveller is included in every stay.</p></div>}
      </div>
    </div>
    <div className="estimate-result"><p>Estimated document service fee</p><output aria-live="polite" aria-atomic="true" className="estimate-total" data-testid="estimated-fee">{formatPrice(quote.totalMinor)}<span> for {travellers} {travellers === 1 ? "traveller" : "travellers"}</span></output>
      <dl>{service !== "hotel" && <div><dt>Flight documents</dt><dd>{formatPrice(quote.flightUnitMinor * travellers)}</dd></div>}{service !== "flight" && <div><dt>Hotel documents · {stays} {stays === 1 ? "stay" : "stays"}</dt><dd>{formatPrice(quote.hotelUnitMinor * travellers)}</dd></div>}{service === "combo" && <div><dt>Combo saving</dt><dd>−{formatPrice(quote.discountUnitMinor * travellers)}</dd></div>}</dl>
      <p className="estimate-hint">Service fees only. Airfare and accommodation costs are separate. Online payments are currently unavailable.</p><Link href={bookingHref} prefetch={false} className="button button-primary">Start this request <span aria-hidden="true">↗</span></Link><p className="estimate-hint">Add your traveller and stay details in the booking form to confirm your total.</p>
    </div><noscript><style>{`.estimate-fields{display:none!important}`}</style><p className="estimate-hint">Enable JavaScript to change this estimate, or use the complete fee comparison below.</p></noscript>
  </section>;
}
