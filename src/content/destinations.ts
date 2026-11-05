import type { Destination } from "./types";
import { withContentDepth } from "./depth";

export const ukSource = {
  title: "GOV.UK — Visiting the UK: guide to supporting documents",
  url: "https://www.gov.uk/government/publications/visitor-visa-guide-to-supporting-documents/guide-to-supporting-documents-visiting-the-uk",
};
export const franceSource = {
  title: "France-Visas — Tourism and private stay",
  url: "https://www.france-visas.gouv.fr/en/tourisme-et-sejour-prive",
};

const baseDestinations: Destination[] = [
  {
    country: "France", slug: "france", title: "France: Flight and Hotel Reservation Guidance",
    description: "Plan France travel paperwork using official France-Visas guidance. Understand dummy flight tickets, hotel bookings and the limits of a combined reservation.",
    intro: "Planning a visit to France? Start with the official checklist for your circumstances, then decide whether a Dummy Flight Ticket, Dummy Hotel Booking or combo is relevant to your application.",
    reviewed: "2026-11-03",
    sections: [
      { heading: "Start with France-Visas", paragraphs: ["France-Visas separates tourism and private stays by the reason and length of the visit. Its online guidance helps identify the supporting documents for your situation. Follow the official tourism page below into the appropriate category; this page is not a personalised visa checklist."], links: [{ href: franceSource.url, label: "Check the official tourism and private-stay guidance" }] },
      { heading: "Match the request to your actual itinerary", paragraphs: ["For a planned Paris stay followed by another city, check flight dates against each check-in and check-out date. A hotel preference in our form is a request, not evidence that a property has accepted a reservation.", "If your official checklist requests accommodation evidence, establish which form it accepts before selecting a hotel document. Do not substitute a commercial hotel request for evidence of a different accommodation arrangement."], items: ["Use the same traveller names across your application and request.", "Review overnight journeys before choosing check-in dates.", "List each intended stay separately and check for gaps."] },
      { heading: "Choose only the service you need", paragraphs: ["Already have suitable flight evidence? You can prepare a hotel-only request. If both document types are relevant, the combo collects traveller details once. Service fees do not pay for flights or rooms, and a temporary reservation does not establish entry eligibility."], links: [{ href: "/pricing", label: "Compare flight, hotel and combo fees" }] },
      { heading: "Before you submit documents", paragraphs: ["Recheck the official checklist and the final document details near submission. Reservation conditions can change; no fixed validity or universal acceptance is promised. Our sample layout is never suitable for an application.", "Saving a request does not reserve a flight or hotel. Online payments are currently unavailable, and unpaid orders do not start document preparation."] },
    ],
    faqs: [
      { question: "Does this page cover every France visa category?", answer: "No. Use France-Visas for your own purpose, nationality, residence and duration. This page explains how to review a reservation request, not whether a visa will be granted." },
      { question: "Can I request several hotel stays?", answer: "Yes, the booking form supports separate stays within its displayed limits. Review the full trip, not only the first night. A request does not confirm availability.", link: { href: "/guides/flight-hotel-date-checklist", label: "Check flight and hotel dates together" } },
    ],
    sources: [franceSource], guideSlugs: ["check-your-document-requirements", "flight-hotel-date-checklist"],
    related: [{ href: "/dummy-ticket", label: "Understand the reservation service" }, { href: "/destinations/united-kingdom", label: "How UK visitor guidance differs" }],
  },
  {
    country: "United Kingdom", slug: "united-kingdom", title: "UK Visitor Documents: Check Before Booking",
    description: "Read the UK visitor-document distinction before requesting a dummy flight ticket or hotel booking. Follow GOV.UK guidance rather than assuming a reservation is needed.",
    intro: "A dummy flight ticket or hotel booking is not automatically useful for a UK visitor application. Read the official evidence guidance before spending money on reservation documents.",
    reviewed: "2026-11-03",
    sections: [
      { heading: "The visitor-evidence distinction", paragraphs: ["GOV.UK lists hotel bookings and flight bookings (unless transiting) in its section on documents not to use as evidence for visit applications. Do not assume you need to buy a reservation for a standard visit. Read the complete guidance and any instructions specific to your application."], links: [{ href: ukSource.url, label: "Read GOV.UK supporting-document guidance, especially section 13" }] },
      { heading: "Transit is a separate question", paragraphs: ["The same guidance treats transit separately. Do not carry a standard-visitor checklist into a transit application or assume a temporary document satisfies onward-travel evidence. Check the official transit instructions for your route."], links: [{ href: ukSource.url + "#passing-through-the-uk-in-transit", label: "Read the official transit section" }] },
      { heading: "What our service can and cannot do", paragraphs: ["We collect requests for temporary flight and hotel reservation documents. We do not assess visa eligibility, replace official evidence instructions or guarantee that a document will be accepted.", "If a reservation document is appropriate for a separate, verified purpose, review the service description and sample before preparing a draft. There is no requirement to order both flight and hotel documents together."], links: [{ href: "/sample-dummy-ticket", label: "Understand the illustrative samples" }] },
      { heading: "A practical decision before ordering", paragraphs: ["Write down the exact document your application asks for, where that instruction appears and the date you checked it. If it does not request a reservation, do not add one just because a commercial website offers it.", "An unpaid draft on this site is a saved request only. It does not establish a reservation, payment or travel entitlement."], items: ["Keep your planned dates consistent across forms.", "Use official guidance for evidence decisions.", "Check whether your question concerns a visit, transit or another category."] },
    ],
    faqs: [
      { question: "Should every UK visitor buy a dummy ticket?", answer: "No. Read the official evidence guidance first; a reservation should not be treated as a universal application requirement." },
      { question: "Does a hotel document pay for my stay?", answer: "No. Our service fee covers a temporary reservation document, not accommodation costs or a guaranteed room.", link: { href: "/guides/temporary-reservation-vs-paid-ticket", label: "Compare a reservation with a paid ticket" } },
    ],
    sources: [ukSource], guideSlugs: ["check-your-document-requirements", "temporary-reservation-vs-paid-ticket"],
    related: [{ href: "/faq", label: "Service questions and limitations" }, { href: "/destinations/france", label: "France reservation guidance" }],
  },
];

export const destinations = baseDestinations.map(withContentDepth);
