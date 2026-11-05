import "server-only";
import { business, bookingPolicy, reservationPolicy } from "@/config/business";
import { publicPages } from "@/content/pages";
import { guides } from "@/content/guides";
import { destinations } from "@/content/destinations";
import type { PublicSiteSnapshot, SitePayload } from "./site-management";

export const siteSeeds: Record<string, SitePayload> = {
  ...Object.fromEntries(publicPages.map(page => [`page:${page.slug}`, page])),
  ...Object.fromEntries(guides.map(page => [`guide:${page.slug}`, page])),
  ...Object.fromEntries(destinations.map(page => [`destination:${page.slug}`, page])),
  "settings:site": { supportEmail: "", whatsapp: "", days: business.hours.days, opens: business.hours.opens, closes: business.hours.closes, minMinutes: business.delivery.minMinutes, maxMinutes: business.delivery.maxMinutes, heroTitle: "Dummy Flight Ticket", heroHighlight: "& Dummy Hotel Booking", heroIntro: "The documents for your planned journey, together in one place. Choose a dummy flight ticket, dummy hotel booking or both. Compare clear service fees, review your details and keep track of your request in your private account.", homeMetaTitle: "Dummy Flight Ticket & Dummy Hotel Booking", homeMetaDescription: "Book a dummy flight ticket, dummy hotel booking or flight + hotel combo. Compare service fees and review temporary reservation documents before preparing a request." },
  "pricing:catalog": { standardFlightMinor: business.prices["one-way"], multiCityMinor: business.prices["multi-city"], hotelMinor: business.hotelPriceMinor, comboDiscountMinor: business.comboDiscountMinor },
  "policies:booking": { flightText: bookingPolicy.text, reservationText: reservationPolicy.text },
};
export const defaultSiteSnapshot: PublicSiteSnapshot = { preferences: siteSeeds["settings:site"] as PublicSiteSnapshot["preferences"], pricing: siteSeeds["pricing:catalog"] as PublicSiteSnapshot["pricing"], policies: { flight: bookingPolicy, reservation: reservationPolicy }, records: [] };
