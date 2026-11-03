"use client";

import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowRight,
  ArrowRightLeft,
  CalendarDays,
  MapPin,
  Route,
} from "lucide-react";
import { business, formatPrice, tripTypes } from "@/config/business";
import { tripToBookingUrl, tripSchema, type TripValues } from "@/lib/trip";
import { useBusinessDate } from "@/lib/use-business-date";

export function TripStarter() {
  const router = useRouter();
  const {
    register,
    control,
    getValues,
    setValue,
    clearErrors,
    handleSubmit,
    formState: { errors },
  } = useForm<TripValues>({
    resolver: zodResolver(tripSchema),
    defaultValues: {
      type: "one-way",
      from: "",
      to: "",
      departure: "",
      returnDate: "",
    },
  });
  const type = useWatch({ control, name: "type" });
  const departure = useWatch({ control, name: "departure" });
  const today = useBusinessDate();
  return (
    <div className="trip-starter" id="trip-starter">
      <div className="starter-heading">
        <h2>Where does your journey begin?</h2>
        <span>Let’s start with your travel plans</span>
      </div>
      <form
        noValidate
        onSubmit={handleSubmit((trip) => router.push(tripToBookingUrl(trip)))}
      >
        <div className="trip-toolbar">
          <fieldset className="trip-types">
            <legend className="sr-only">Trip type</legend>
            {tripTypes.map((trip) => (
              <label className="trip-type" key={trip.value}>
                <input
                  type="radio"
                  value={trip.value}
                  {...register("type", {
                    onChange: () => {
                      clearErrors("returnDate");
                      setValue("returnDate", "");
                    },
                  })}
                />
                <span>{trip.label}</span>
              </label>
            ))}
          </fieldset>
          <span className="starter-price">
            <strong>{formatPrice(business.prices[type])}</strong> / passenger
          </span>
        </div>
        <div
          className={`trip-fields ${type === "return" ? "with-return" : ""}`}
        >
          <div className="form-field">
            <label htmlFor="from">
              <MapPin size={15} /> From
            </label>
            <input
              id="from"
              placeholder="City or airport"
              autoComplete="off"
              maxLength={100}
              {...register("from")}
              aria-invalid={!!errors.from}
              aria-describedby={errors.from ? "from-error" : undefined}
            />
            {errors.from && (
              <p className="field-error" id="from-error">
                {errors.from.message}
              </p>
            )}
          </div>
          <button
            className="swap-button"
            type="button"
            aria-label="Swap departure and destination"
            onClick={() => {
              const from = getValues("from");
              setValue("from", getValues("to"), { shouldValidate: true });
              setValue("to", from, { shouldValidate: true });
            }}
          >
            <ArrowRightLeft size={17} />
          </button>
          <div className="form-field">
            <label htmlFor="to">
              <MapPin size={15} /> To
            </label>
            <input
              id="to"
              placeholder="City or airport"
              autoComplete="off"
              maxLength={100}
              {...register("to")}
              aria-invalid={!!errors.to}
              aria-describedby={errors.to ? "to-error" : undefined}
            />
            {errors.to && (
              <p className="field-error" id="to-error">
                {errors.to.message}
              </p>
            )}
          </div>
          <div className="form-field">
            <label htmlFor="departure">
              <CalendarDays size={15} /> Departure date
            </label>
            <input
              id="departure"
              type="date"
              min={today}
              {...register("departure")}
              aria-invalid={!!errors.departure}
              aria-describedby={
                errors.departure ? "departure-error" : undefined
              }
            />
            {errors.departure && (
              <p className="field-error" id="departure-error">
                {errors.departure.message}
              </p>
            )}
          </div>
          {type === "return" && (
            <div className="form-field">
              <label htmlFor="returnDate">
                <CalendarDays size={15} /> Return date
              </label>
              <input
                id="returnDate"
                type="date"
                min={departure > today ? departure : today}
                {...register("returnDate")}
                aria-invalid={!!errors.returnDate}
                aria-describedby={
                  errors.returnDate ? "return-error" : undefined
                }
              />
              {errors.returnDate && (
                <p className="field-error" id="return-error">
                  {errors.returnDate.message}
                </p>
              )}
            </div>
          )}
          <button
            type="submit"
            disabled={!today}
            className="button button-primary trip-submit"
          >
            Book Dummy Ticket <ArrowRight size={18} />
          </button>
        </div>
        {type === "multi-city" && (
          <p className="multi-city-note">
            <Route size={16} /> Start with your first sector. Up to{" "}
            {business.maxSectors} sectors can be added in the booking form.
          </p>
        )}
        <p className="starter-disclaimer">
          Continue to your temporary booking draft. Sign-in and payment are not
          yet available.
        </p>
        <noscript>
          <p className="starter-disclaimer">
            Enable JavaScript to try the trip starter. The service information
            and FAQs remain available below.
          </p>
        </noscript>
      </form>
    </div>
  );
}
