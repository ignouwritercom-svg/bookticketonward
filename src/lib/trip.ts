import { z } from "zod";
import { business } from "@/config/business";

export function todayInBusinessTimezone() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: business.hours.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export const dateSchema = z.string().refine((value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}, "Choose a valid date.");

export const tripTypeSchema = z.enum(["one-way", "return", "multi-city"]);
export const citySchema = z
  .string()
  .trim()
  .min(2, "Enter a city or airport (at least 2 characters).")
  .max(100, "Use 100 characters or fewer.");
export const normalizeCity = (value: string) =>
  value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en");

export function validateSector(
  sector: { from: string; to: string; departure: string },
  ctx: z.RefinementCtx,
) {
  if (
    sector.from &&
    sector.to &&
    normalizeCity(sector.from) === normalizeCity(sector.to)
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["to"],
      message: "Choose a different destination.",
    });
  }
  if (
    dateSchema.safeParse(sector.departure).success &&
    sector.departure < todayInBusinessTimezone()
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["departure"],
      message: "Choose today or a future date.",
    });
  }
}

export function validateReturnDate(
  departure: string,
  returnDate: string | undefined,
  ctx: z.RefinementCtx,
) {
  if (!dateSchema.safeParse(returnDate).success) {
    ctx.addIssue({
      code: "custom",
      path: ["returnDate"],
      message: "Choose a valid return date.",
    });
  } else if (returnDate! < departure) {
    ctx.addIssue({
      code: "custom",
      path: ["returnDate"],
      message: "Return must be on or after departure.",
    });
  }
}

export const sectorSchema = z
  .object({ from: citySchema, to: citySchema, departure: dateSchema })
  .superRefine(validateSector);

export const tripSchema = z
  .object({
    type: tripTypeSchema,
    from: z
      .string()
      .trim()
      .min(2, "Enter a departure city or airport.")
      .max(100, "Use 100 characters or fewer."),
    to: z
      .string()
      .trim()
      .min(2, "Enter a destination city or airport.")
      .max(100, "Use 100 characters or fewer."),
    departure: dateSchema,
    returnDate: z.string().optional(),
  })
  .superRefine((trip, ctx) => {
    validateSector(trip, ctx);
    if (trip.type === "return")
      validateReturnDate(trip.departure, trip.returnDate, ctx);
  });

export type TripValues = z.infer<typeof tripSchema>;

// Explicit allowlist: never serialize a form object or passenger/contact data.
export function tripToBookingUrl(trip: TripValues) {
  const params = new URLSearchParams({
    type: trip.type,
    from: trip.from,
    to: trip.to,
    departure: trip.departure,
  });
  if (trip.type === "return" && trip.returnDate)
    params.set("returnDate", trip.returnDate);
  return `/book?${params.toString()}`;
}

export function formatTravelDate(value: string) {
  if (!dateSchema.safeParse(value).success) return "Date not selected";
  return new Intl.DateTimeFormat(business.locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}
