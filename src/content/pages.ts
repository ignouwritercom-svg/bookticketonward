import { business } from "@/config/business";
import type { PublicContent, Question } from "./types";
import { withContentDepth } from "./depth";
import { aboutPage } from "./about";
const deliveryTarget = "{{delivery_target}}", workingHours = "{{working_hours}}";

export const serviceFaqs: Question[] = [
  { question: "What is a dummy flight ticket?", answer: "A temporary flight reservation document. The service fee does not buy a paid airline ticket, a boarding pass or permission to travel.", link: { href: "/guides/temporary-reservation-vs-paid-ticket", label: "Reservation vs paid ticket" } },
  { question: "What does a dummy hotel booking cover?", answer: "A temporary hotel reservation document for the requested stay. It does not pay the room rate or guarantee availability, check-in or acceptance by an authority.", link: { href: "/dummy-ticket#hotel-and-combo", label: "Hotel and combo services" } },
  { question: "Can I request flight and hotel together?", answer: "Yes. Choose the combo and enter travellers once. Review flight sectors and each hotel stay separately. The combo discount applies once per traveller.", link: { href: "/pricing", label: "Compare combo fees" } },
  { question: "Will a dummy ticket guarantee my visa?", answer: "No. Acceptance and visa decisions belong to the relevant authority. Some processes may not need reservation evidence at all. Check your official checklist first.", link: { href: "/destinations", label: "Find official starting points" } },
  { question: "How long is a reservation valid?", answer: "No fixed validity period is promised. Read the conditions of the actual reservation and check its suitability for your submission timing. A sample or saved draft is not a valid reservation." },
  { question: "Can I pay now?", answer: "Online payments are currently unavailable. You can verify your email, save your details and create an order awaiting payment. Saving an order does not charge you, reserve travel or begin document preparation.", link: { href: "/how-it-works", label: "See the booking process" } },
  { question: "How will I receive my documents?", answer: "After verified payment and preparation, available PDFs appear in your account for secure download. Email or WhatsApp delivery follows your selected preference. Check your order for its current status; an order update is not confirmation of document delivery.", link: { href: "/account/orders", label: "Open your orders" } },
  { question: "Do I need an email if I choose WhatsApp?", answer: "Yes. A verified account email is required independently of delivery preference. WhatsApp delivery also needs a phone number with country code.", link: { href: "/book", label: "Prepare your request" } },
  { question: "What should I do if my plans change?", answer: "You can edit and save a draft before creating an order. Editing a draft does not change an existing order. Review the changes and refunds information before requesting a correction.", link: { href: "/refunds", label: "Changes and refunds" } },
  { question: "Do you collect passport scans?", answer: "No. The booking form does not request passport numbers, identity-document uploads or postal addresses. Do not add these to free-text instructions.", link: { href: "/privacy", label: "Read the privacy notice" } },
];

const basePublicPages: PublicContent[] = [
  {
    slug: "dummy-ticket", title: "Dummy Flight Ticket and Hotel Booking Services",
    description: "Choose a Dummy Flight Ticket, Dummy Hotel Booking or Flight + Hotel Combo. Understand temporary reservations, service fees and document limitations before booking.",
    intro: "Travel paperwork starts with the right request. Choose a Dummy Flight Ticket, a Dummy Hotel Booking or both together, with clear service fees and one set of traveller details.", reviewed: "2026-11-04",
    sections: [
      { heading: "Dummy Flight Ticket", paragraphs: ["Request a temporary reservation document for a one-way, return or multi-city itinerary. Enter your planned route and dates, then review your traveller details. Your request does not confirm flight availability or reserve a seat.", "The service fee covers the reservation-document service. It does not purchase a paid airline ticket and the document is not valid for boarding."], links: [{ href: "/book?service=flight", label: "Prepare a dummy flight ticket request" }, { href: "/sample-dummy-ticket", label: "See an illustrative sample" }] },
      { heading: "Hotel and combo", paragraphs: ["A Dummy Hotel Booking covers a requested temporary hotel reservation document. Accommodation costs are separate. Enter the destination and stay dates; a property or area preference is a request, not a confirmed room.", "The Dummy Flight + Hotel Combo puts both document services in one order. Traveller details are shared, and each hotel stay is reviewed separately. Choose hotel-only if you do not need a flight document."], links: [{ href: "/book?service=hotel", label: "Prepare a dummy hotel booking" }, { href: "/book?service=combo", label: "Prepare a flight + hotel combo" }] },
      { heading: "Check whether a reservation is appropriate", paragraphs: ["Read your application authority's official instructions before ordering. No document guarantees visa approval or universal acceptance. A listed destination is an information page, not an embassy endorsement.", "We do not promise a fixed reservation validity period. Check the actual reservation conditions and the timing of your submission."], links: [{ href: "/destinations", label: "Explore sourced destination guidance" }, { href: "/guides/check-your-document-requirements", label: "Find the right document checklist" }] },
      { heading: "Save your request securely", paragraphs: ["Review your details and verify your email to save your request. You can return to saved drafts from your account and create an order when ready. Online payments are currently unavailable; new orders remain awaiting payment and document preparation does not begin."], links: [{ href: "/how-it-works", label: "Follow the full process" }] },
    ], related: [{ href: "/pricing", label: "Compare service fees" }, { href: "/faq", label: "Common service questions" }],
  },
  {
    slug: "pricing", title: "Dummy Ticket, Hotel and Combo Service Fees",
    description: "Compare dummy flight ticket, hotel booking and combo service fees in INR, with per-traveller pricing, additional-stay costs and clear payment limitations.",
    intro: "Simple document service fees in INR. These prices are not airfare or hotel room rates. Review your traveller count, trip type and number of stays to understand the total.", reviewed: "2026-11-04", feature: "prices",
    sections: [
      { heading: "How the total is calculated", paragraphs: ["Flight fees depend on trip type and apply per traveller. A hotel fee applies per traveller per stay, not per night or room. A combo adds the flight and hotel fees, then applies the combo discount once per traveller.", "Additional stays add another hotel service fee for every traveller. All travellers on an order appear on every hotel stay."], items: [`Up to ${business.maxPassengers} travellers per request.`, `Up to ${business.maxSectors} flight sectors for multi-city.`, `Up to ${business.maxHotelStays} hotel stays, each no longer than ${business.maxHotelNights} nights.`] },
      { heading: "Saving a request does not charge you", paragraphs: ["Online payments are currently unavailable. The estimate helps you review the service fee before saving your request. New orders remain awaiting payment; no document preparation begins until payment has been verified.", "A saved order is not a payment confirmation. Do not send money to an unlisted contact."], links: [{ href: "/refunds", label: "Changes and refunds" }, { href: "/terms", label: "Review service terms" }] },
    ], related: [{ href: "/dummy-ticket", label: "What each service covers" }, { href: "/guides/flight-hotel-date-checklist", label: "Review a combo request" }],
  },
  {
    slug: "how-it-works", title: "How Dummy Flight and Hotel Requests Work",
    description: "Follow the request process: choose a service, review details, verify your email and save an unpaid order. Learn when private documents can become available.",
    intro: "Prepare your travel-document request in a few clear stages. Drafts, orders, payments and document delivery are separate so you can see exactly what has happened.", reviewed: "2026-11-04",
    sections: [
      { heading: "1. Choose the document service", paragraphs: ["Select flight, hotel or combo. Add flight sectors when needed and a separate entry for every hotel stay. Check the official requirements for your purpose before choosing a service."], links: [{ href: "/dummy-ticket", label: "Compare the three services" }] },
      { heading: "2. Review travellers and delivery details", paragraphs: ["Enter names and dates carefully, then choose email or WhatsApp delivery. Your account email is required either way. Review the total and confirm the details before saving; no personal details are placed in the booking URL."] },
      { heading: "3. Verify your email and save", paragraphs: ["Enter the code sent to your email to sign in. Use the same email for your booking and account, then save your reviewed details. You can create an order when ready. Unsaved changes are lost on refresh; saved drafts are available in your account."], links: [{ href: "/login", label: "Sign in to your account" }] },
      { heading: "4. Check your payment status", paragraphs: ["Online payments are currently unavailable. New orders show Awaiting payment, and saving an order does not charge you or reserve travel. Document preparation begins only after verified payment and complete details."] },
      { heading: "5. Access your documents", paragraphs: ["After verified payment, our team prepares your documents and makes them available in your account. A combo includes flight and hotel documents, supplied separately or in one PDF. Only you can download your order’s available documents; withdrawn versions cannot be downloaded.", `Our preparation target is ${deliveryTarget} after verified payment and complete details during ${workingHours}. This is a target, not guaranteed delivery.`, "Email or WhatsApp document delivery follows your selected preference. Check your account for current progress; a status update alone does not confirm delivery."], links: [{ href: "/account/orders", label: "View saved drafts and orders" }] },
    ], related: [{ href: "/sample-dummy-ticket", label: "Review document examples" }, { href: "/faq", label: "Questions about saving and delivery" }],
  },
  {
    slug: "sample-dummy-ticket", title: "Illustrative Dummy Flight and Hotel Samples",
    description: "Inspect clearly labelled flight and hotel document illustrations. These samples contain no issued reservation reference and cannot be used for travel or an application.",
    intro: "See the kind of information to review on a reservation document. These illustrations are not issued reservations, downloadable tickets or documents for an application.", reviewed: "2026-11-04", feature: "samples",
    sections: [
      { heading: "What to check on a flight document", paragraphs: ["Review the traveller name, route, departure and return dates where applicable, and the reservation conditions. Compare every sector with your planned itinerary. Layout and available details can vary with the actual reservation.", "The sample has no issued reservation reference. Use it to understand the layout; it cannot be submitted as evidence of a booking."] },
      { heading: "What to check on a hotel document", paragraphs: ["Review the guests, property and location details when issued, check-in and check-out dates, and the applicable reservation conditions. A requested preference in the booking form is not a property confirmation.", "For a combo, check that flight and stay dates agree. A service fee does not pay accommodation charges, and a reservation document is not a guarantee of check-in."], links: [{ href: "/guides/flight-hotel-date-checklist", label: "Use the flight and hotel checklist" }] },
    ], related: [{ href: "/dummy-ticket", label: "Understand what the service covers" }, { href: "/pricing", label: "See document service fees" }],
  },
  {
    slug: "faq", title: "Dummy Flight Ticket and Hotel Booking FAQs",
    description: "Answers about dummy flight tickets, hotel reservations, combo prices, email verification, private documents, validity and the current payment hold.",
    intro: "Find clear answers about dummy flight tickets, dummy hotel bookings, service fees and your account. Check what your request includes before entering your details.", reviewed: "2026-11-04", faqs: serviceFaqs,
    sections: [{ heading: "Find help for your stage", paragraphs: ["Comparing services? Start with pricing and the samples. Reviewing an existing request? Sign in to view its actual payment and fulfilment status. For application requirements, use the official authority's guidance."], links: [{ href: "/pricing", label: "Service fees" }, { href: "/sample-dummy-ticket", label: "Illustrative samples" }, { href: "/account/orders", label: "Your orders" }] }],
    related: [{ href: "/contact", label: "Booking and account help" }, { href: "/guides", label: "Practical planning guides" }],
  },
  {
    slug: "contact", title: "Contact and Booking Help",
    description: "Get help with dummy flight tickets, hotel booking requests, email sign-in and saved orders. Find practical answers and check your account for current order details.",
    intro: "Need help with a booking request? Find answers about the service, signing in, saved details and your order status.", reviewed: "2026-11-04", draft: true,
    sections: [
      { heading: "For a saved draft or order", paragraphs: ["Sign in with the email you used for your request to resume saved details and check your order status. Available PDFs are listed with your order. Orders awaiting payment have not begun document preparation."], links: [{ href: "/account/orders", label: "Open your account" }, { href: "/how-it-works", label: "Understand order stages" }] },
      { heading: "For service questions", paragraphs: ["Read the service description, fee breakdown and FAQs before preparing a request. For visa or entry requirements, contact the relevant official authority; this service does not determine eligibility."], links: [{ href: "/faq", label: "Read frequently asked questions" }, { href: "/destinations", label: "Find official destination sources" }] },
      { heading: "Trouble signing in?", paragraphs: ["Use the email address you used for your booking. Check your inbox and spam folder, and enter the latest verification code. If you need a new code, wait for the resend countdown before trying again.", "If sign-in is temporarily unavailable, try again later. Keep this page open while preparing a request: unsaved details are cleared when you refresh or leave the page."], links: [{ href: "/login", label: "Sign in with your email" }] },
      { heading: "Contact channels", paragraphs: ["Direct email and telephone support are currently unavailable. This page provides self-service help and does not send enquiries. Never share your sign-in code, password or identity-document scan with an unverified contact."], links: [{ href: "/faq", label: "Browse all service questions" }] },
    ], related: [{ href: "/privacy", label: "Privacy notice" }, { href: "/refunds", label: "Changes and refunds" }],
  },
  {
    slug: "terms", title: "Terms of Service",
    description: "Understand DummyTicket's temporary reservation document services, your booking responsibilities, account access and the conditions for document preparation.",
    intro: "Understand what your reservation request includes, what to check before saving and when document preparation can begin.", reviewed: "2026-11-04", draft: true,
    sections: [
      { heading: "Service scope", paragraphs: ["The selected service concerns temporary flight and/or hotel reservation documents. Fees do not buy paid airline tickets or accommodation. No visa approval, universal acceptance, boarding eligibility, room availability or fixed reservation validity is promised."] },
      { heading: "Your request and account", paragraphs: ["Check all traveller names, dates, routes, stays and delivery details. Use your own verified account email and do not share authentication codes. Check the receiving authority's requirements before requesting documents.", "Saving a draft is distinct from creating an order. An order keeps the details, service fee and terms you confirmed; editing a draft does not amend an existing order."] },
      { heading: "Payment and preparation", paragraphs: ["Online payments are currently unavailable. New orders remain awaiting payment and do not start document preparation. Verified payment and complete details are required before preparation begins.", "A draft, sample or unpaid order is not a confirmed reservation. Available documents appear in your account after preparation; external delivery follows your selected preference."], links: [{ href: "/how-it-works", label: "Booking and delivery process" }] },
      { heading: "Changes and cancellations", paragraphs: ["You can edit and save a draft before creating an order. Changes to a draft do not change an existing order. Read the changes and refunds information before requesting a correction or cancellation."], links: [{ href: "/refunds", label: "Changes and refunds" }, { href: "/contact", label: "Booking help" }] },
    ], related: [{ href: "/privacy", label: "Privacy notice" }, { href: "/dummy-ticket", label: "Service scope and limitations" }],
  },
  {
    slug: "privacy", title: "Privacy Notice",
    description: "Learn what details DummyTicket requests, why they are used for your booking, how account access works and how private reservation documents are handled.",
    intro: "Your booking details are used to manage your request and prepare the selected reservation documents. Here is what the form asks for and how account access works.", reviewed: "2026-11-04", draft: true,
    sections: [
      { heading: "Information the form requests", paragraphs: ["Booking details include routes and dates, hotel stays when selected, traveller names, dates of birth, travel-document sex markers, optional nationality, account email and delivery preference. WhatsApp delivery requires a telephone number. Optional instructions and appointment information may also be supplied.", "The form does not request passport numbers, identity-document scans or postal addresses. Do not include them in instructions."] },
      { heading: "Saving and account access", paragraphs: ["Unsaved details are cleared when you refresh or leave the form. After you verify your email and save, your booking records are stored with Supabase, our account and booking storage provider. Session cookies keep you signed in; personal booking details are not saved in your browser’s local or session storage.", "The website does not include an analytics or advertising tracker."] },
      { heading: "Staff, documents and delivery", paragraphs: ["Authorised staff can access your order details to prepare and manage documents. You must sign in to download your own available PDFs. Other customers cannot access your documents, and withdrawn versions cannot be downloaded.", "Email or WhatsApp delivery uses the corresponding external provider when your document is sent. Account updates and document delivery are separate; selecting a delivery preference does not immediately send a document."] },
      { heading: "Account activity and email updates", paragraphs: ["Your account records order updates and whether you have read them. Where email updates are available, they use your verified account email even if you select WhatsApp for document delivery. These are service updates, not marketing.", "Order-update emails can contain the order reference, route and date summary, service fee and a link to your account. They do not include passenger names, dates of birth, private notes or PDF attachments. Check your account for current information if an email does not arrive."] },
      { heading: "Retention and privacy enquiries", paragraphs: ["This provisional notice does not specify a fixed retention period or offer automatic deletion. Signing out ends your current session; it does not delete a saved booking or order.", "Direct privacy enquiries are currently unavailable. Check the help page for current contact options, and do not send personal documents to an unverified address."], links: [{ href: "/contact", label: "Booking and contact help" }] },
    ], related: [{ href: "/terms", label: "Service terms" }, { href: "/faq", label: "Account and document FAQs" }],
  },
  {
    slug: "refunds", title: "Changes, Cancellations and Refunds",
    description: "Understand saved booking changes, orders awaiting payment and current cancellation and refund information for dummy flight and hotel reservation requests.",
    intro: "Check what you can edit and what saving an order means. Online payments are currently unavailable, so creating a new order does not charge you.", reviewed: "2026-11-04", draft: true,
    sections: [
      { heading: "An unpaid order is not a charge", paragraphs: ["Saving a draft or creating an unpaid order does not collect money. It does not begin document preparation. There is no payment to refund merely because an unpaid order appears in your account."] },
      { heading: "Correcting a draft or existing order", paragraphs: ["Review and save your draft after making changes. An existing order keeps its original confirmed details and service fee. Editing a draft does not update that order or mean a requested correction has been accepted."], links: [{ href: "/account/orders", label: "Review your saved records" }] },
      { heading: "Cancellation and refund information", paragraphs: ["This provisional page does not set paid-order cancellation eligibility, deductions or refund processing times. Do not rely on it as a promise of an automatic refund or a non-refundable charge.", "An order’s payment status and its document status are separate. A saved order, status update or document download is not proof that a refund has been requested or processed."] },
      { heading: "Before requesting a reservation", paragraphs: ["Check your official document requirements, confirm traveller details and understand that service fees are separate from airfare and accommodation. Review the current service terms before creating an order."], links: [{ href: "/guides/check-your-document-requirements", label: "Check the right evidence first" }] },
    ], related: [{ href: "/terms", label: "Service terms" }, { href: "/contact", label: "Booking help" }, { href: "/pricing", label: "Service fees" }],
  },
  {
    slug: "destinations", title: "Destination Guidance for Reservation Documents",
    description: "Explore carefully reviewed France and UK guidance with official sources. Check whether a dummy flight ticket or hotel booking is relevant before ordering.",
    intro: "A short, researched collection of destination notes. Each page points to official guidance and explains what to check before choosing a dummy flight or hotel document.", reviewed: "2026-11-04", feature: "destinations",
    sections: [{ heading: "Your checklist comes first", paragraphs: ["Requirements depend on your circumstances and application category. These pages do not claim embassy approval, visa success or universal acceptance. A country appearing here does not mean you need a reservation document.", "We add destinations only when there is useful, source-backed guidance to publish. Recheck the official source near your application date."], links: [{ href: "/guides/check-your-document-requirements", label: "Learn how to check your requirements" }] }],
    related: [{ href: "/guides", label: "Travel-document planning guides" }, { href: "/dummy-ticket", label: "What our services cover" }],
  },
  {
    slug: "guides", title: "Practical Dummy Reservation Planning Guides",
    description: "Learn the difference between reservations and paid travel, how to find official document requirements and how to check flight and hotel dates together.",
    intro: "Clear explanations for preparing a reservation request. Use these guides to check your details and understand the service, then follow official sources for application requirements.", reviewed: "2026-11-04", feature: "guides",
    sections: [{ heading: "Using these guides", paragraphs: ["Use the practical checklists to review your plans, then follow the linked official sources for your application category. These guides provide service information, not personalised immigration advice.", "Review dates show when the content was checked. Requirements can change, so recheck the official source before submitting documents."] }],
    related: [{ href: "/destinations", label: "Browse destination sources" }, { href: "/faq", label: "Quick answers about the service" }],
  },
];

export const publicPages = [aboutPage, ...basePublicPages].map(withContentDepth);
