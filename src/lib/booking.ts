import { z } from "zod";
import { business } from "@/config/business";
import {
  citySchema,
  dateSchema,
  sectorSchema,
  todayInBusinessTimezone,
  tripTypeSchema,
  validateReturnDate,
} from "./trip";

export const itinerarySchema = z
  .object({
    type: tripTypeSchema,
    sectors: z
      .array(sectorSchema)
      .min(1, "Add your journey.")
      .max(business.maxSectors, `Use up to ${business.maxSectors} sectors.`),
    returnDate: z.string(),
  })
  .superRefine((trip, ctx) => {
    if (trip.type === "multi-city") {
      if (trip.sectors.length < 2)
        ctx.addIssue({
          code: "custom",
          path: ["sectors"],
          message: "Multi-city requires at least 2 sectors.",
        });
      trip.sectors.forEach((sector, index) => {
        if (
          index > 0 &&
          sector.departure &&
          sector.departure < trip.sectors[index - 1].departure
        ) {
          ctx.addIssue({
            code: "custom",
            path: ["sectors", index, "departure"],
            message: "This sector must depart on or after the previous sector.",
          });
        }
      });
    } else if (trip.sectors.length !== 1) {
      ctx.addIssue({
        code: "custom",
        path: ["sectors"],
        message: "Use one outward sector for this trip type.",
      });
    }
    if (trip.type === "return")
      validateReturnDate(
        trip.sectors[0]?.departure ?? "",
        trip.returnDate,
        ctx,
      );
  });

const nameSchema = z
  .string()
  .trim()
  .max(100, "Use 100 characters or fewer.")
  .refine(
    (value) =>
      !value || (/^[\p{L}\p{M} .’'ʼ-]+$/u.test(value) && /\p{L}/u.test(value)),
    "Use letters, spaces, apostrophes or hyphens, as on your passport.",
  );
export const passengerSchema = z
  .object({
    givenNames: nameSchema.refine(
      (value) => value.length > 0,
      "Enter the passenger’s given names.",
    ),
    surname: z.string().trim().max(100, "Use 100 characters or fewer."),
    singleName: z.boolean(),
    dob: dateSchema,
    sex: z
      .enum(["", "F", "M", "X"])
      .refine(
        (value) => value !== "",
        "Select sex as shown on the travel document.",
      ),
    nationality: z.string().trim().max(80, "Use 80 characters or fewer."),
  })
  .superRefine((passenger, ctx) => {
    if (!passenger.singleName && !passenger.surname)
      ctx.addIssue({
        code: "custom",
        path: ["surname"],
        message: "Enter a surname, or choose the single-name option.",
      });
    if (
      !passenger.singleName &&
      passenger.surname &&
      !nameSchema.safeParse(passenger.surname).success
    )
      ctx.addIssue({
        code: "custom",
        path: ["surname"],
        message:
          "Use letters, spaces, apostrophes or hyphens, as on your passport.",
      });
    if (
      dateSchema.safeParse(passenger.dob).success &&
      passenger.dob > todayInBusinessTimezone()
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["dob"],
        message: "Date of birth cannot be in the future.",
      });
    }
  });
const passengersSchema = z
  .array(passengerSchema)
  .min(1, "Add at least one passenger.")
  .max(
    business.maxPassengers,
    `Add up to ${business.maxPassengers} passengers.`,
  );
const normalizePhone = (value: string) => value.replace(/[\s()-]/g, "");
export const isInternationalPhone = (value: string) =>
  /^\+[1-9]\d{6,14}$/.test(normalizePhone(value));
const emailSchema = z
  .string()
  .trim()
  .max(254, "Use 254 characters or fewer.")
  .email("Enter a valid account email address.");

export const communicationSchema = z
  .object({
    accountEmail: emailSchema,
    channel: z.enum(["whatsapp", "email"]),
    whatsapp: z.string().trim().max(30, "Use 30 characters or fewer."),
    alternateContact: z
      .string()
      .trim()
      .max(254, "Use 254 characters or fewer."),
    purpose: z.string().trim().max(120, "Use 120 characters or fewer."),
    appointmentDate: z.string(),
    specialInstructions: z
      .string()
      .trim()
      .max(2000, "Use 2,000 characters or fewer."),
  })
  .superRefine((contact, ctx) => {
    if (
      contact.channel === "whatsapp" &&
      !isInternationalPhone(contact.whatsapp)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["whatsapp"],
        message: "Enter a WhatsApp number with +country code and 7–15 digits.",
      });
    }
    if (
      contact.alternateContact &&
      !emailSchema.safeParse(contact.alternateContact).success &&
      !isInternationalPhone(contact.alternateContact)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["alternateContact"],
        message: "Enter an email address or a phone number with +country code.",
      });
    }
    if (
      contact.appointmentDate &&
      (!dateSchema.safeParse(contact.appointmentDate).success ||
        contact.appointmentDate < todayInBusinessTimezone())
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["appointmentDate"],
        message:
          "Choose today or a future appointment date, or leave this empty.",
      });
    }
  });

const confirmationSchema = z.object({
  detailsCorrect: z
    .boolean()
    .refine(
      Boolean,
      "Confirm that the passenger names and trip details are correct.",
    ),
  termsAccepted: z
    .boolean()
    .refine(
      Boolean,
      "Read and accept the draft service terms to continue this preview.",
    ),
});

export const hotelStaySchema = z.object({
  city: citySchema,
  country: z.string().trim().min(2, "Enter the destination country.").max(80),
  checkIn: dateSchema,
  checkOut: dateSchema,
  rooms: z.number().int().min(1, "Choose at least one room.").max(business.maxPassengers),
  preference: z.string().trim().max(120, "Use 120 characters or fewer."),
}).superRefine((stay,ctx) => {
  if(stay.checkIn < todayInBusinessTimezone()) ctx.addIssue({code:"custom",path:["checkIn"],message:"Choose today or a future check-in date."});
  if(stay.checkOut <= stay.checkIn) ctx.addIssue({code:"custom",path:["checkOut"],message:"Check-out must be after check-in."});
  if((Date.parse(stay.checkOut)-Date.parse(stay.checkIn))/86400000 > business.maxHotelNights) ctx.addIssue({code:"custom",path:["checkOut"],message:`Use up to ${business.maxHotelNights} nights per stay.`});
});
export type HotelStay = z.input<typeof hotelStaySchema>;
export const emptyHotelStay = (): HotelStay => ({city:"",country:"",checkIn:"",checkOut:"",rooms:1,preference:""});
const rawTripSchema = z.object({type:tripTypeSchema,sectors:z.array(z.object({from:z.string(),to:z.string(),departure:z.string()})).max(business.maxSectors),returnDate:z.string()});
const rawHotelSchema = z.object({city:z.string(),country:z.string(),checkIn:z.string(),checkOut:z.string(),rooms:z.number().or(z.nan()),preference:z.string()});
const travelShape = {
  service: z.enum(["flight","hotel","combo"]).optional(),
  hotels: z.array(rawHotelSchema).max(business.maxHotelStays).optional(),
  trip: rawTripSchema,
};
function validateTravel(data: {service?: "flight"|"hotel"|"combo"; trip: z.input<typeof rawTripSchema>; hotels?: HotelStay[]},ctx:z.RefinementCtx) {
  if(data.service!=="hotel") {
    const parsed=itinerarySchema.safeParse(data.trip);
    if(!parsed.success) for(const issue of parsed.error.issues) ctx.addIssue({...issue,path:["trip",...issue.path]});
  }
  if(data.service==="hotel" || data.service==="combo") {
    if(!data.hotels?.length) ctx.addIssue({code:"custom",path:["hotels"],message:"Add at least one hotel stay."});
    data.hotels?.forEach((stay,index)=>{
      const parsed=hotelStaySchema.safeParse(stay);
      if(!parsed.success) for(const issue of parsed.error.issues) ctx.addIssue({...issue,path:["hotels",index,...issue.path]});
      if(index && stay.checkIn < data.hotels![index-1].checkOut) ctx.addIssue({code:"custom",path:["hotels",index,"checkIn"],message:"Stays must be in date order and must not overlap."});
    });
  }
}

function validatePassengerDates(
  data: {
    passengers: { dob: string }[];
    trip: { sectors: { departure: string }[] };
    service?: "flight"|"hotel"|"combo";
    hotels?: HotelStay[];
  },
  ctx: z.RefinementCtx,
) {
  const departure = data.service==="hotel" ? data.hotels?.[0]?.checkIn : data.trip.sectors[0]?.departure;
  if(data.service==="hotel" || data.service==="combo") data.hotels?.forEach((stay,index)=>{
    if(stay.rooms > data.passengers.length) ctx.addIssue({code:"custom",path:["hotels",index,"rooms"],message:"Room count cannot exceed the number of travellers."});
  });
  data.passengers.forEach((passenger, index) => {
    if (
      departure &&
      dateSchema.safeParse(passenger.dob).success &&
      passenger.dob > departure
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["passengers", index, "dob"],
        message: "Date of birth must be on or before the first departure date.",
      });
    }
  });
}

// Shared validation for the form and authenticated server endpoints.
// Unsaved input stays in memory; only validated, authenticated drafts are persisted.
export const bookingSchema = z
  .object({
    ...travelShape,
    passengers: passengersSchema,
    communication: communicationSchema,
    confirmations: confirmationSchema,
  })
  .superRefine(validateTravel)
  .superRefine(validatePassengerDates)
  .transform(data=> ({...data, service:data.service ?? "flight", hotels:data.service==="hotel" || data.service==="combo" ? (data.hotels ?? []).map(stay=>hotelStaySchema.parse(stay)) : [], trip:data.service==="hotel" ? {type:"one-way" as const,sectors:[],returnDate:""} : itinerarySchema.parse(data.trip)}));
export type BookingDraft = z.input<typeof bookingSchema>;
export type ValidatedBooking = z.output<typeof bookingSchema>;
export type Passenger = BookingDraft["passengers"][number];
export type Sector = BookingDraft["trip"]["sectors"][number];

const tripStepSchema = z.object(travelShape).superRefine(validateTravel);
const passengerStepSchema = z
  .object({
    passengers: passengersSchema,
    service: travelShape.service,
    hotels: travelShape.hotels,
    trip: z.object({ sectors: z.array(z.object({ departure: z.string() })) }),
  })
  .superRefine(validatePassengerDates);
const communicationStepSchema = z.object({
  communication: communicationSchema,
});

export function validateBookingStep(data: BookingDraft, step: number) {
  if (step === 0) return tripStepSchema.safeParse(data);
  if (step === 1) return passengerStepSchema.safeParse(data);
  if (step === 2) return communicationStepSchema.safeParse(data);
  return bookingSchema.safeParse(data);
}

export const emptySector = (): Sector => ({ from: "", to: "", departure: "" });
export const emptyPassenger = (): Passenger => ({
  givenNames: "",
  surname: "",
  singleName: false,
  dob: "",
  sex: "",
  nationality: "",
});

// URL values are untrusted, bounded and allowlisted. Passenger/contact query keys
// are deliberately ignored. No live airport dataset or flight availability is used.
export function createBookingDraft(
  params: Pick<URLSearchParams, "get">,
): BookingDraft {
  const type = tripTypeSchema.safeParse(params.get("type"));
  const parsedType = type.success ? type.data : "one-way";
  const readCity = (key: string) => {
    const value = citySchema.safeParse(params.get(key));
    return value.success ? value.data : "";
  };
  const readDate = (key: string) => {
    const value = dateSchema.safeParse(params.get(key));
    return value.success ? value.data : "";
  };
  const first = {
    from: readCity("from"),
    to: readCity("to"),
    departure: readDate("departure"),
  };
  return {
    service: ["hotel","combo"].includes(params.get("service") ?? "") ? params.get("service") as "hotel"|"combo" : "flight",
    hotels: ["hotel","combo"].includes(params.get("service") ?? "") ? [emptyHotelStay()] : [],
    trip: {
      type: parsedType,
      sectors: parsedType === "multi-city" ? [first, emptySector()] : [first],
      returnDate: parsedType === "return" ? readDate("returnDate") : "",
    },
    passengers: [emptyPassenger()],
    communication: {
      accountEmail: "",
      channel: "email",
      whatsapp: "",
      alternateContact: "",
      purpose: "",
      appointmentDate: "",
      specialInstructions: "",
    },
    confirmations: { detailsCorrect: false, termsAccepted: false },
  };
}

export function itinerarySectors(trip: BookingDraft["trip"]): Sector[] {
  const first = trip.sectors[0];
  if (trip.type !== "return" || !first) return trip.sectors;
  return [
    first,
    { from: first.to, to: first.from, departure: trip.returnDate },
  ];
}
