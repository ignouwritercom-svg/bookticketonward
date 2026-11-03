"use client";

import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { Plus, Trash2, UserRound } from "lucide-react";
import { business } from "@/config/business";
import { emptyPassenger, type BookingDraft } from "@/lib/booking";
import { BookingCheckbox, BookingField } from "./field";

export function PassengerStep({ today }: { today: string }) {
  const { control, clearErrors, setFocus } = useFormContext<BookingDraft>();
  const passengers = useWatch({ control, name: "passengers" });
  const departure = useWatch({ control, name: "trip.sectors.0.departure" });
  const { fields, append, remove } = useFieldArray({
    control,
    name: "passengers",
  });
  return (
    <>
      <p className="booking-help">
        Copy each name exactly as it appears on the passport, including middle
        names. You don’t need a passport number or upload.
      </p>
      {fields.map((field, index) => (
        <fieldset className="booking-entry" key={field.id}>
          <legend>Passenger {index + 1}</legend>
          <div className="entry-actions">
            <button
              type="button"
              className="remove-button"
              disabled={fields.length <= 1}
              onClick={() => {
                remove(index);
                clearErrors("passengers");
                requestAnimationFrame(() =>
                  setFocus(`passengers.${Math.max(0, index - 1)}.givenNames`),
                );
              }}
              aria-label={`Remove passenger ${index + 1}`}
            >
              <Trash2 size={15} /> Remove
            </button>
          </div>
          <BookingCheckbox
            name={`passengers.${index}.singleName`}
            label="My passport has only one name"
            onChange={() => clearErrors(`passengers.${index}.surname`)}
          />
          <div className="booking-fields-grid">
            <BookingField
              name={`passengers.${index}.givenNames`}
              label={
                passengers[index]?.singleName
                  ? "Name as shown on passport"
                  : "Given names (including middle names)"
              }
              maxLength={100}
            />
            {!passengers[index]?.singleName && (
              <BookingField
                name={`passengers.${index}.surname`}
                label="Surname"
                maxLength={100}
              />
            )}
            <BookingField
              name={`passengers.${index}.dob`}
              label="Date of birth"
              type="date"
              max={departure && departure < today ? departure : today}
              hint="Must be on or before the first departure, and not in the future."
            />
            <BookingField
              name={`passengers.${index}.sex`}
              label="Sex as shown on travel document"
              options={[
                { value: "", label: "Select as on document" },
                { value: "F", label: "Female (F)" },
                { value: "M", label: "Male (M)" },
                { value: "X", label: "Unspecified / other (X)" },
              ]}
            />
            <BookingField
              name={`passengers.${index}.nationality`}
              label="Nationality (optional)"
              maxLength={80}
            />
          </div>
          {passengers[index]?.singleName && (
            <p className="field-hint">
              Enter your complete single name above. A surname is not required;
              our team will review the naming format before fulfilment.
            </p>
          )}
        </fieldset>
      ))}
      <div className="booking-add-row">
        <button
          type="button"
          className="button button-secondary"
          disabled={fields.length >= business.maxPassengers}
          onClick={() =>
            append(emptyPassenger(), {
              focusName: `passengers.${fields.length}.givenNames`,
            })
          }
        >
          <Plus size={17} /> Add passenger
        </button>
        <span>
          {fields.length} of {business.maxPassengers} passengers
        </span>
      </div>
      <div className="booking-note">
        <UserRound size={18} />
        <p>
          The configured service fee applies to each passenger. Adding or
          removing a passenger updates your total.
        </p>
      </div>
    </>
  );
}
