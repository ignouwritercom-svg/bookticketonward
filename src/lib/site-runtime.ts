import { formatPrice, getReservationQuote, type ServiceCatalog } from "@/config/business";
import type { Pricing, SitePreferences, PublicRuntime } from "./site-management";
export type { PublicRuntime, SitePreferences, Pricing } from "./site-management";
export const editorialToday = (date = new Date()) => date.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
// Public runtime helpers contain no editor schemas, drafts, secrets or user data.
export const preferenceHours = (settings: SitePreferences) => `${settings.days}, ${settings.opens}–${settings.closes} (Asia/Kolkata)`;
export const preferenceDelivery = (settings: SitePreferences) => `${settings.minMinutes}–${settings.maxMinutes} working minutes`;
export const pricingCatalog = (pricing: Pricing): ServiceCatalog => ({ prices: { "one-way": pricing.standardFlightMinor, return: pricing.standardFlightMinor, "multi-city": pricing.multiCityMinor }, hotelPriceMinor: pricing.hotelMinor, comboDiscountMinor: pricing.comboDiscountMinor });
export function materializeContent<T>(payload: T, runtime: PublicRuntime): T {
  const catalog = pricingCatalog(runtime.pricing);
  const tokens: Record<string, string> = { flight_fee: formatPrice(runtime.pricing.standardFlightMinor), hotel_fee: formatPrice(runtime.pricing.hotelMinor), combo_fee: formatPrice(getReservationQuote("one-way", 1, "combo", 1, catalog).totalMinor), hotel_two_one: formatPrice(getReservationQuote("one-way", 2, "hotel", 1, catalog).totalMinor), hotel_two_two: formatPrice(getReservationQuote("one-way", 2, "hotel", 2, catalog).totalMinor), combo_two_one: formatPrice(getReservationQuote("one-way", 2, "combo", 1, catalog).totalMinor), combo_two_two: formatPrice(getReservationQuote("one-way", 2, "combo", 2, catalog).totalMinor), working_hours: preferenceHours(runtime.preferences), delivery_target: preferenceDelivery(runtime.preferences) };
  const visit = (value: unknown): unknown => typeof value === "string" ? value.replace(/\{\{([a-z_]+)\}\}/g, (match, name: string) => tokens[name] ?? match) : Array.isArray(value) ? value.map(visit) : value && typeof value === "object" ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, visit(item)])) : value;
  return visit(payload) as T;
}
