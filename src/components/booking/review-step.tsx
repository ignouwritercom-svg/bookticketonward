"use client";

import { ArrowRight, Pencil } from "lucide-react";
import { policyForService, formatPrice, getReservationQuote, tripTypes, serviceLabels } from "@/config/business";
import { HotelSummary } from "./hotel-summary";
import { itinerarySectors, type BookingDraft } from "@/lib/booking";
import { formatTravelDate } from "@/lib/trip";
import { BookingCheckbox } from "./field";
import { DeliveryInformation } from "./communication-step";

export function ReviewStep({
  draft,
  onEdit,
}: {
  draft: BookingDraft;
  onEdit: (step: number) => void;
}) {
  const service=draft.service ?? "flight";
  const bookingPolicy=policyForService(service);
  const quote = getReservationQuote(draft.trip.type,draft.passengers.length,service,draft.hotels?.length ?? 0);
  const communication = draft.communication;
  return (
    <>
      <p className="booking-help">
        Check every detail before continuing. You can edit any section without
        re-entering the rest of your draft.
      </p>
      <p><strong>{serviceLabels[service]}</strong></p>
      {service!=="hotel" && <section className="review-section" aria-labelledby="review-trip">
        <div className="review-title">
          <h3 id="review-trip">
            Your trip ·{" "}
            {tripTypes.find((trip) => trip.value === draft.trip.type)?.label}
          </h3>
          <button
            type="button"
            className="text-link"
            onClick={() => onEdit(0)}
            aria-label="Edit trip details"
          >
            <Pencil size={14} /> Edit
          </button>
        </div>
        <ol className="review-sectors">
          {itinerarySectors(draft.trip).map((sector, index) => (
            <li key={index}>
              <span className="review-sector-number">{index + 1}</span>
              <div>
                <p>
                  <strong>{sector.from}</strong>
                  <ArrowRight size={15} />
                  <strong>{sector.to}</strong>
                </p>
                <span>{formatTravelDate(sector.departure)}</span>
              </div>
            </li>
          ))}
        </ol>
      </section>}
      {service!=="flight" && <section className="review-section" aria-labelledby="review-hotels"><div className="review-title"><h3 id="review-hotels">Hotel stays</h3><button type="button" className="text-link" onClick={()=>onEdit(0)} aria-label="Edit hotel stays">Edit</button></div><HotelSummary hotels={draft.hotels ?? []} /></section>}
      <section className="review-section" aria-labelledby="review-passengers">
        <div className="review-title">
          <h3 id="review-passengers">Passengers ({draft.passengers.length})</h3>
          <button
            type="button"
            className="text-link"
            onClick={() => onEdit(1)}
            aria-label="Edit passenger details"
          >
            <Pencil size={14} /> Edit
          </button>
        </div>
        {draft.passengers.map((passenger, index) => (
          <div className="review-passenger" key={index}>
            <h4>
              {index + 1}. {passenger.givenNames}
              {!passenger.singleName && ` ${passenger.surname}`}
            </h4>
            <dl>
              <div>
                <dt>Date of birth</dt>
                <dd>{formatTravelDate(passenger.dob)}</dd>
              </div>
              <div>
                <dt>Sex on document</dt>
                <dd>
                  {
                    {
                      F: "Female (F)",
                      M: "Male (M)",
                      X: "Unspecified / other (X)",
                      "": "Not selected",
                    }[passenger.sex]
                  }
                </dd>
              </div>
              <div>
                <dt>Nationality</dt>
                <dd>{passenger.nationality || "Not provided"}</dd>
              </div>
            </dl>
            {passenger.singleName && (
              <p className="field-hint">
                Single name as shown on passport · No surname
              </p>
            )}
          </div>
        ))}
      </section>
      <section className="review-section" aria-labelledby="review-contact">
        <div className="review-title">
          <h3 id="review-contact">Communication & delivery</h3>
          <button
            type="button"
            className="text-link"
            onClick={() => onEdit(2)}
            aria-label="Edit communication details"
          >
            <Pencil size={14} /> Edit
          </button>
        </div>
        <dl className="review-contact">
          <div>
            <dt>Account email (verified before saving)</dt>
            <dd>{communication.accountEmail}</dd>
          </div>
          <div>
            <dt>Preferred delivery</dt>
            <dd>
              {communication.channel === "whatsapp"
                ? `WhatsApp · ${communication.whatsapp}`
                : `Email · ${communication.accountEmail}`}
            </dd>
          </div>
          <div>
            <dt>Alternate contact</dt>
            <dd>{communication.alternateContact || "Not provided"}</dd>
          </div>
          <div>
            <dt>Purpose</dt>
            <dd>{communication.purpose || "Not provided"}</dd>
          </div>
          <div>
            <dt>Appointment / submission</dt>
            <dd>
              {communication.appointmentDate
                ? formatTravelDate(communication.appointmentDate)
                : "Not provided"}
            </dd>
          </div>
          <div>
            <dt>Special instructions</dt>
            <dd className="review-instructions">
              {communication.specialInstructions || "None provided"}
            </dd>
          </div>
        </dl>
      </section>
      <section className="review-section" aria-labelledby="review-price">
        <div className="review-title">
          <h3 id="review-price">Service fee</h3>
        </div>
        <div className="review-price">
          <span>
            {formatPrice(quote.pricePerPassengerMinor)} × {quote.passengerCount}{" "}
            {quote.passengerCount === 1 ? "passenger" : "passengers"}
          </span>
          <strong>
            {formatPrice(quote.totalMinor)} <small>{quote.currency}</small>
          </strong>
        </div>
        {service!=="flight" && <dl className="review-contact"><div><dt>Flight fee per traveller</dt><dd>{formatPrice(quote.flightUnitMinor)}</dd></div><div><dt>Hotel fee per traveller · {draft.hotels?.length} stay(s)</dt><dd>{formatPrice(quote.hotelUnitMinor)}</dd></div>{service==="combo" && <div><dt>Combo saving per traveller</dt><dd>−{formatPrice(quote.discountUnitMinor)}</dd></div>}</dl>}
        <p className="field-hint">
          For the temporary reservation document only. This fee does not buy a
          paid airline ticket or hotel accommodation. No payment is taken in this preview.
        </p>
      </section>
      <DeliveryInformation />
      <details className="draft-terms" id="draft-service-terms">
        <summary>Read the draft service terms</summary>
        <div>
          <p>
            <strong>
              Draft policy wording — for this development preview only.
            </strong>{" "}
            Policy version: {bookingPolicy.version}. {bookingPolicy.text}
          </p>
          <ul>
            <li>
              This is a manually prepared temporary reservation document, not a
              paid airline ticket or a document for boarding.
            </li>
            <li>
              Visa approval, acceptance by any organisation and fixed
              reservation validity are not guaranteed.
            </li>
            <li>
              You are responsible for checking your passenger names, route,
              dates and application requirements.
            </li>
            <li>
              The delivery estimate starts only after verified payment and
              receipt of complete details, during the stated working hours.
            </li>
            <li>
              Changes, cancellations and refunds will be governed by the final
              published policies. Saved orders await payment and no fee is
              charged in this phase.
            </li>
          </ul>
        </div>
      </details>
      <BookingCheckbox
        name="confirmations.detailsCorrect"
        label="I confirm that the passenger names and trip details are correct."
      />
      <BookingCheckbox
        name="confirmations.termsAccepted"
        label="I have read and accept the draft service terms for this preview."
      />
    </>
  );
}
