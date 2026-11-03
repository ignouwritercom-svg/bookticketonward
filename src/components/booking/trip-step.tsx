"use client";

import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { Plus, Route, Trash2 } from "lucide-react";
import { business, tripTypes } from "@/config/business";
import { emptySector, type BookingDraft } from "@/lib/booking";
import { BookingField } from "./field";

export function TripStep({ today }: { today: string }) {
  const { control, register, getValues, clearErrors, setFocus } =
    useFormContext<BookingDraft>();
  const type = useWatch({ control, name: "trip.type" });
  const sectors = useWatch({ control, name: "trip.sectors" });
  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: "trip.sectors",
  });
  return (
    <>
      <fieldset className="booking-trip-types">
        <legend>Trip type</legend>
        <div className="trip-types">
          {tripTypes.map((trip) => (
            <label className="trip-type" key={trip.value}>
              <input
                type="radio"
                value={trip.value}
                {...register("trip.type", {
                  onChange: (event) => {
                    clearErrors("trip");
                    const current = getValues("trip.sectors");
                    if (
                      event.target.value === "multi-city" &&
                      current.length < 2
                    )
                      append(emptySector(), { shouldFocus: false });
                    if (
                      event.target.value !== "multi-city" &&
                      current.length > 1
                    )
                      replace([current[0]]);
                  },
                })}
              />
              <span>{trip.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <p className="booking-help">
        Enter a city or airport manually. No live flight search or availability
        is shown.
      </p>
      {fields.map((field, index) => (
        <fieldset className="booking-entry" key={field.id}>
          <legend>
            {type === "multi-city" ? `Sector ${index + 1}` : "Outward journey"}
          </legend>
          {type === "multi-city" && (
            <div className="entry-actions">
              <button
                type="button"
                className="remove-button"
                disabled={fields.length <= 2}
                onClick={() => {
                  remove(index);
                  clearErrors("trip");
                  requestAnimationFrame(() =>
                    setFocus(`trip.sectors.${Math.max(0, index - 1)}.from`),
                  );
                }}
                aria-label={`Remove sector ${index + 1}`}
              >
                <Trash2 size={15} /> Remove
              </button>
            </div>
          )}
          <div className="booking-fields-grid">
            <BookingField
              name={`trip.sectors.${index}.from`}
              label="From"
              placeholder="City or airport"
              maxLength={100}
            />
            <BookingField
              name={`trip.sectors.${index}.to`}
              label="To"
              placeholder="City or airport"
              maxLength={100}
            />
            <BookingField
              name={`trip.sectors.${index}.departure`}
              label="Departure date"
              type="date"
              min={
                index > 0 && sectors[index - 1]?.departure > today
                  ? sectors[index - 1].departure
                  : today
              }
            />
            {type === "return" && (
              <BookingField
                name="trip.returnDate"
                label="Return date"
                type="date"
                min={
                  sectors[0]?.departure > today ? sectors[0].departure : today
                }
                hint="Your return journey reverses the outward route."
              />
            )}
          </div>
        </fieldset>
      ))}
      {type === "multi-city" && (
        <div className="booking-add-row">
          <button
            className="button button-secondary"
            type="button"
            disabled={fields.length >= business.maxSectors}
            onClick={() =>
              append(emptySector(), {
                focusName: `trip.sectors.${fields.length}.from`,
              })
            }
          >
            <Plus size={17} /> Add sector
          </button>
          <span>
            {fields.length} of {business.maxSectors} sectors · Minimum 2
          </span>
        </div>
      )}
      <div className="booking-note">
        <Route size={18} />
        <p>
          Use your intended travel dates. For multi-city trips, sectors must be
          in date order; onward travel from a different city is allowed.
        </p>
      </div>
    </>
  );
}
