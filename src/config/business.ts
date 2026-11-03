export const business = {
  brand: "DummyTicket",
  service: "Dummy Ticket",
  currency: "INR",
  locale: "en-IN",
  // Integer minor currency units (paise). Never calculate totals with decimals.
  prices: { "one-way": 69_900, return: 69_900, "multi-city": 99_900 },
  minorUnitsPerMajor: 100,
  maxSectors: 4,
  maxPassengers: 6,
  hotelPriceMinor: 69_900,
  comboDiscountMinor: 19_900,
  maxHotelStays: 4,
  maxHotelNights: 30,
  delivery: { minMinutes: 30, maxMinutes: 60, channels: ["WhatsApp", "email"] },
  hours: {
    days: "Daily",
    opens: "09:00",
    closes: "21:00",
    timezone: "Asia/Kolkata",
  },
  contact: { email: null, phone: null, address: null },
  phase: 4,
} as const;

// Update the database catalog in a NEW migration when changing this snapshot or prices.
export const bookingPolicy = {
  version: "preview-2026-10-22",
  text: "Temporary reservation document only; not a paid airline ticket or valid for boarding. Visa acceptance and fixed validity are not guaranteed. Check names, dates and application requirements. Delivery timing begins only after verified payment and complete details during working hours. Payments are not enabled yet. No fulfilment starts for unpaid orders. Final change, cancellation and refund policies must be published before payments open.",
} as const;

export type TripType = keyof typeof business.prices;
export type ServiceType = "flight" | "hotel" | "combo";
export const serviceLabels = { flight: "Dummy Flight Ticket", hotel: "Dummy Hotel Booking", combo: "Dummy Flight + Hotel Combo" } as const;
export const reservationPolicy = {
  version: "preview-2026-11-02-reservations",
  text: "Service fees cover temporary flight and/or hotel reservation documents selected in this order, not paid airline tickets or paid hotel accommodation. Visa acceptance, availability and fixed reservation validity are not guaranteed. Review all traveller names, flight dates, hotel cities and stay dates. Hotel fees are per traveller per stay, not per night or room; combo discount applies once per traveller. Fulfilment starts only after verified payment and complete details during working hours. Payments are not enabled yet. Final change, cancellation and refund policies must be published before payments open.",
};
export function policyForService(service: ServiceType = "flight") { return service === "flight" ? bookingPolicy : reservationPolicy; }
export function getReservationQuote(type: TripType, passengerCount: number, service: ServiceType = "flight", stays = 0) {
  const base = getBookingQuote(type, passengerCount);
  if (service !== "flight" && (!Number.isInteger(stays) || stays < 1 || stays > business.maxHotelStays)) throw new Error("Invalid hotel stay count.");
  const flightUnitMinor = service === "hotel" ? 0 : base.pricePerPassengerMinor;
  const hotelUnitMinor = service === "flight" ? 0 : business.hotelPriceMinor * stays;
  const discountUnitMinor = service === "combo" ? business.comboDiscountMinor : 0;
  const unit = flightUnitMinor + hotelUnitMinor - discountUnitMinor;
  return { ...base, pricePerPassengerMinor: unit, totalMinor: unit * passengerCount, flightUnitMinor, hotelUnitMinor, discountUnitMinor };
}
export const tripTypes: {
  value: TripType;
  label: string;
  description: string;
}[] = [
  {
    value: "one-way",
    label: "One-way",
    description: "One destination. A simple start.",
  },
  {
    value: "return",
    label: "Return",
    description: "Your outward and return journey.",
  },
  {
    value: "multi-city",
    label: "Multi-city",
    description: `More stops. Up to ${business.maxSectors} sectors.`,
  },
];

export function formatPrice(amountMinor: number) {
  return new Intl.NumberFormat(business.locale, {
    style: "currency",
    currency: business.currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amountMinor / business.minorUnitsPerMajor);
}

export function getBookingQuote(type: TripType, passengerCount: number) {
  if (
    !Number.isInteger(passengerCount) ||
    passengerCount < 1 ||
    passengerCount > business.maxPassengers
  ) {
    throw new Error("Passenger count is outside the supported range.");
  }
  const pricePerPassengerMinor = business.prices[type];
  return {
    currency: business.currency,
    passengerCount,
    pricePerPassengerMinor,
    totalMinor: pricePerPassengerMinor * passengerCount,
  };
}

export const deliveryTarget = `${business.delivery.minMinutes}–${business.delivery.maxMinutes} working minutes`;
export const workingHours = `${business.hours.days}, ${business.hours.opens}–${business.hours.closes} (${business.hours.timezone})`;
