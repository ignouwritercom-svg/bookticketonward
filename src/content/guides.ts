import type { Guide } from "./types";
import { franceSource, ukSource } from "./destinations";
import { business } from "@/config/business";

export const guides: Guide[] = [
  {
    slug: "temporary-reservation-vs-paid-ticket", title: "Temporary reservation vs paid airline ticket",
    description: "Understand what a dummy flight ticket or hotel document covers, what the service fee buys and why a temporary reservation is not permission to travel.",
    excerpt: "Know what you are requesting before comparing service fees with airfare or room rates.",
    intro: "A Dummy Flight Ticket is a temporary reservation document. Paying a document service fee does not buy an airline ticket, and a Dummy Hotel Booking does not pay for a room.",
    published: "2026-11-03", reviewed: "2026-11-03",
    sections: [
      { heading: "Separate the document from the journey", paragraphs: ["A reservation document records travel arrangements under the conditions of that reservation. It is not a boarding pass, a guarantee of carriage or proof that accommodation costs have been paid. A paid airline ticket and a hotel's paid accommodation arrangement are separate purchases.", "Before travel, arrange the actual ticket and accommodation you need through the relevant provider. Do not turn up at an airport or hotel relying on our illustrative sample or on an unpaid website order."] },
      { heading: "Read the fee correctly", paragraphs: ["Our prices are document service fees per traveller. Hotel fees also depend on the number of stays, not nights or rooms. A combo combines the selected document services and applies the configured discount once per traveller."], links: [{ href: "/pricing", label: "See the current fee breakdown" }] },
      { heading: "Check the document, not just its appearance", paragraphs: ["Review the traveller names, route, dates and stated reservation conditions. A polished PDF is not evidence of universal acceptance or guaranteed validity. We do not promise a fixed reservation duration or invent a reservation reference in the sample."], links: [{ href: "/sample-dummy-ticket", label: "Inspect the labelled samples" }] },
      { heading: "Keep application requirements separate", paragraphs: ["The authority receiving your application decides what evidence it accepts. GOV.UK and France-Visas provide different guidance for their own processes; neither endorses this service. Use the official sources below to find the appropriate instructions, not to infer acceptance of any commercial document."] },
    ], sources: [ukSource, franceSource], relatedGuideSlugs: ["check-your-document-requirements"],
    related: [{ href: "/dummy-ticket", label: "Explore our dummy reservation services" }, { href: "/faq", label: "Read service FAQs" }],
  },
  {
    slug: "check-your-document-requirements", title: "How to check travel-document requirements",
    description: "A practical method for finding official application guidance, recording the right checklist and deciding whether a flight or hotel reservation is relevant.",
    excerpt: "Find the right authority and checklist before ordering a reservation document.",
    intro: "Start with the authority handling your application, not a generic country checklist. Your purpose, route and circumstances matter more than a service website's list of destinations.",
    published: "2026-11-03", reviewed: "2026-11-03",
    sections: [
      { heading: "Find the right official starting point", paragraphs: ["Identify your destination, the purpose of travel, your nationality and where you are applying. Navigate from the official government or immigration portal to the relevant category. A search snippet or a commercial booking page is not the complete instruction."], items: ["Check whether you are reading visitor, transit or another guidance category.", "Look for the issuing authority and update date.", "Follow links to the application-specific checklist."] },
      { heading: "Record what is actually requested", paragraphs: ["Keep the official link and the date you checked it. Note whether the instruction asks for an itinerary, a reservation, evidence of accommodation or something else. If wording is unclear, use the authority's published enquiry process rather than guessing.", "For example, UK visitor guidance distinguishes flight and hotel bookings from useful evidence, while France-Visas directs applicants through its own tourism categories. A rule from one process should not be reused for another."], links: [{ href: "/destinations/united-kingdom", label: "Read the UK visitor distinction" }, { href: "/destinations/france", label: "Find the France-Visas starting point" }] },
      { heading: "Match your document request to the checklist", paragraphs: ["Request only the service that fits the verified instruction. Hotel-only requests do not need flight sectors; combo requests share traveller details. Check the route and stay dates together before saving.", "A destination being listed on this site does not mean that an embassy accepts our documents. This guide is a way to organise your research, not a decision about your eligibility."] },
      { heading: "Review again near submission", paragraphs: ["Guidance and reservation conditions can change. Reopen the official source before submitting, check for updated instructions and read the actual document you receive. Keep your final travel purchases separate from a temporary reservation request."] },
    ], sources: [ukSource, franceSource], relatedGuideSlugs: ["flight-hotel-date-checklist", "temporary-reservation-vs-paid-ticket"],
    related: [{ href: "/destinations", label: "Browse reviewed destination notes" }, { href: "/how-it-works", label: "Understand the booking workflow" }],
  },
  {
    slug: "flight-hotel-date-checklist", title: "A flight and hotel date-checking checklist",
    description: "Check traveller names, overnight flights, hotel check-in and check-out dates, multiple stays and combo fees before saving your dummy reservation request.",
    excerpt: "Catch mismatched names and stay dates before saving a flight and hotel combo.",
    intro: "A combo saves you entering traveller details twice. It still needs a careful review of each journey and stay. Use this checklist before saving your request.",
    published: "2026-11-03", reviewed: "2026-11-03",
    sections: [
      { heading: "Review every traveller once", paragraphs: ["Match names to the travel document you will use. Check date of birth and any single-name spelling carefully. All travellers in the request appear on each hotel stay; do not use one order for different groups staying on different dates.", "Do not put passport numbers or identity-document images into the instructions field. This booking form does not request them."] },
      { heading: "Think in local calendar dates", paragraphs: ["A flight leaving on one date may arrive the next day. Our form collects dates, not live flight schedules, so you must check the intended arrival date before choosing hotel check-in. An early arrival does not imply early room access."], items: ["Compare the first stay's check-in with the planned arrival.", "Check check-out against onward travel.", "Review gaps and overlaps when changing cities.", "Do not assume a city preference confirms a particular property."] },
      { heading: "Check what each stay includes", paragraphs: [`Enter the city, country, check-in, check-out and room count. The current form supports up to ${business.maxHotelStays} non-overlapping stays, with a maximum of ${business.maxHotelNights} nights per stay. These are this service's form limits, not visa or hotel-industry rules.`, "Hotel fees apply per traveller per stay. A longer stay within the limit does not multiply the service fee by the number of nights. Additional stays increase the fee; the combo discount applies once."], links: [{ href: "/pricing", label: "Check the illustrated combo calculation" }] },
      { heading: "Save, then review the order status", paragraphs: ["Verify the account email and choose your delivery preference. Saving creates a draft; creating an order leaves it awaiting payment. The preview cannot take payment or begin fulfilment for an unpaid order.", "If you discover an error, review the saved draft and order separately. Editing a draft does not rewrite an existing order's details or its price snapshot."], links: [{ href: "/how-it-works", label: "See draft and order stages" }] },
    ], sources: [{ title: "DummyTicket service fees and form limits", url: "/pricing" }, { title: "DummyTicket booking process", url: "/how-it-works" }], relatedGuideSlugs: ["check-your-document-requirements"],
    related: [{ href: "/dummy-ticket#hotel-and-combo", label: "Read about hotel and combo requests" }, { href: "/destinations/france", label: "France planning notes" }],
  },
];
