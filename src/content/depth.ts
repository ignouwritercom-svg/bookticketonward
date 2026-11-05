import type { ContentOverview, ContentSection, PublicContent } from "./types";

// Editorial additions are shared by the rendered article, contents navigation and
// collection exports. No personal data, legal promises or separate pricing rules.
type ContentDepth = { overview: ContentOverview; sections: ContentSection[]; leadWithDetails?: boolean };
const flight = "{{flight_fee}}";
const hotel = "{{hotel_fee}}";
const combo = "{{combo_fee}}";

const depth: Record<string, ContentDepth> = {
  "dummy-ticket": {
    leadWithDetails: true,
    overview: { label: "Choose with confidence", title: "The right documents. One clear request.", points: ["Flight, hotel or both in one order", "Review traveller details before saving", "Private access to available documents"], action: { href: "/pricing", label: "Compare services and fees" } },
    sections: [
      { heading: "Which dummy reservation service fits your plans?", paragraphs: ["Start with the evidence you actually need. Choosing a combo is useful when both document types are relevant; it is not a requirement to buy two services."], cards: [
        { title: "Flight only", text: `From ${flight} per traveller for a one-way or return itinerary. Choose multi-city when your planned route needs separate sectors.`, points: ["Flight route and intended dates", "Traveller names entered once", "Airfare purchased separately"], link: { href: "/book?service=flight", label: "Start a flight request" } },
        { title: "Hotel only", text: `${hotel} per traveller per stay. Useful when you already have suitable flight evidence and only need a hotel reservation document.`, points: ["City, country and stay dates", "Room count and optional area preference", "Room rent purchased separately"], link: { href: "/book?service=hotel", label: "Start a hotel request" } },
        { title: "Flight + hotel", text: `From ${combo} per traveller with one hotel stay. Bring both document requests together without repeating your traveller and contact details.`, points: ["Shared traveller details", "Independent review of every stay", "One order for both document types"], link: { href: "/book?service=combo", label: "Start a combo request" } },
      ] },
      { heading: "What to have ready before you start", paragraphs: ["A little preparation avoids mismatched dates and duplicated requests. Keep your official checklist beside you and use the spelling from your travel document; you do not need to upload that document."], items: ["The exact cities or airports and intended departure dates for each flight sector.", "For hotels: each city, country, check-in, check-out and room count. Check overnight arrivals separately.", "Every traveller's name and date of birth, plus a reachable account email.", "Your preferred delivery channel. WhatsApp also requires the country code and telephone number."], links: [{ href: "/guides/flight-hotel-date-checklist", label: "Use the flight and hotel checklist" }] },
    ],
  },
  pricing: {
    overview: { label: "No mental arithmetic", title: "See the total before you save.", points: ["INR service fees per traveller", "Hotel stays counted separately", "One combo discount per traveller"], action: { href: "#estimate-heading", label: "Calculate your service fee" } },
    sections: [
      { heading: "What your service fee includes", paragraphs: ["Compare the document service, not the cost of taking the trip. The fee relates to the selected temporary reservation documents and their management within your order."], cards: [
        { title: "Your selected documents", text: "Flight, hotel or a combo according to the service and itinerary you confirm. Hotel documents are based on the stays you enter, rather than a nightly room charge." },
        { title: "Review and account access", text: "Review names, dates and the fee before saving. Return to your account to see the saved order and access documents when they are eligible and available." },
        { title: "Keep travel costs separate", text: "Airfare, hotel accommodation, visa fees and insurance are not included. The document fee does not buy permission to board, check in or enter a country." },
      ] },
      { heading: "Compare two common hotel scenarios", paragraphs: ["The number of nights and rooms does not multiply our hotel document fee. A separate stay does, because it is another reservation-document request for the travellers on the order."], cards: [
        { title: "One city, one stay, two travellers", text: `Hotel-only is {{hotel_two_one}}. A one-way or return flight + hotel combo is {{combo_two_one}} for the same two travellers.` },
        { title: "Two cities, two stays, two travellers", text: `Hotel-only is {{hotel_two_two}}. A one-way or return flight + hotel combo is {{combo_two_two}}. These examples exclude airfare and room rent.` },
      ], links: [{ href: "/guides/flight-hotel-date-checklist", label: "Review multiple stays before booking" }] },
    ],
  },
  "how-it-works": {
    overview: { label: "Know the next step", title: "Prepare. Review. Keep track.", points: ["No passport scan needed", "Email verification before saving", "Payment and document status stay separate"], action: { href: "/book", label: "Prepare your request" } },
    sections: [
      { heading: "Understand what each order stage means", paragraphs: ["A draft, an order and an available document are different things. Check the stage in your account before assuming a reservation has been prepared."], layout: "steps", cards: [
        { title: "Saved draft", text: "Your reviewed details have been saved to your account. You can return and edit them. Unsaved edits still need an explicit save." },
        { title: "Order awaiting payment", text: "The order records the details and service fee you confirmed. It is not a payment receipt or a reservation; online payments are currently unavailable." },
        { title: "Document preparation", text: "Preparation may begin only after verified payment and complete details. A saved draft or unpaid order cannot skip this stage." },
        { title: "Available documents", text: "Sign in to your order to download available, published PDFs. If a version is withdrawn, it is no longer available for download." },
      ] },
      { heading: "Check these details at the review screen", paragraphs: ["Read the complete summary rather than only the total. It is easier to correct a draft before an order is created than to discover that an old order still contains your previous plan."], items: ["Compare each traveller name with the travel document spelling, including single-name travellers.", "Check flight sectors in sequence and confirm whether a return journey or multi-city route is intended.", "Check every hotel stay against arrival and onward-travel dates; a departure date is not necessarily an arrival date.", "Confirm the verified account email and delivery preference. Document delivery and account email updates are separate."], links: [{ href: "/contact", label: "Help with saving, sign-in or documents" }] },
    ],
  },
  "sample-dummy-ticket": {
    overview: { label: "Look beyond the layout", title: "Know what to check in a document.", points: ["Illustrative flight and hotel layouts", "No issued reservation reference shown", "Actual details and layout may differ"], action: { href: "#sample-layouts", label: "Inspect the sample layouts" } },
    sections: [
      { heading: "How to review a flight reservation document", paragraphs: ["A clean layout makes details easier to read, but appearance alone does not establish reservation validity or acceptance. Check the actual information on the document prepared for your order."], cards: [
        { title: "Traveller identity", text: "Compare every traveller name and its spelling with your travel document and application. A sample name on this page is only an illustration." },
        { title: "Route and dates", text: "Read each sector in order. Check the cities or airports and intended dates against the request you confirmed, especially for return and multi-city journeys." },
        { title: "Reservation conditions", text: "Read the actual reservation details and any stated conditions. Do not infer a validity period from a screenshot or treat a document as a paid airline ticket." },
      ] },
      { heading: "How to review a hotel reservation document", paragraphs: ["Compare the guest details, location and the full stay period with your request. A property preference entered in the form does not itself confirm a particular property."], items: ["Match guest names and the destination to the intended stay.", "Read check-in and check-out separately; account for overnight flights and changes of city.", "For several stays, compare the whole itinerary for gaps or overlaps.", "Check the actual reservation conditions. Our service fee does not pay accommodation costs."], links: [{ href: "/guides/flight-hotel-date-checklist", label: "Open the combined date checklist" }] },
    ],
  },
  faq: {
    overview: { label: "Answers before you start", title: "Find the answer for your stage.", points: ["Understand the document service", "Compare fees and delivery steps", "Get help with your existing request"], action: { href: "/contact", label: "Find booking and account help" } },
    sections: [
      { heading: "Choose where to go next", paragraphs: ["You do not need to read every answer to find your next step. Start with the part of the process you are working on."], cards: [
        { title: "Still comparing services?", text: "See the difference between flight-only, hotel-only and combo requests, then compare per-traveller fees with the estimator.", link: { href: "/pricing", label: "Compare document fees" } },
        { title: "Preparing an application?", text: "Use the official authority's checklist before deciding which reservation document, if any, is appropriate for your circumstances.", link: { href: "/guides/check-your-document-requirements", label: "Check your requirements" } },
        { title: "Already saved your details?", text: "Sign in with the account email used for the request. Your account shows saved drafts, orders, status and available documents.", link: { href: "/account/orders", label: "Find your saved request" } },
      ] },
    ],
  },
  contact: {
    overview: { label: "Help for your next step", title: "Start with your account or checklist.", points: ["Return to drafts and existing orders", "Resolve common sign-in questions", "Check document and payment status"], action: { href: "/account/orders", label: "Open your account" } },
    sections: [
      { heading: "Troubleshoot the issue you are seeing", paragraphs: ["Use these checks before starting a duplicate request. Your saved records stay in the account associated with the verified email used to create them."], cards: [
        { title: "The sign-in code has not arrived", text: "Check the email address you entered and your spam or junk folder. Use the resend option when it becomes available and enter the latest code. Never share your code with anyone." },
        { title: "I cannot find my draft or order", text: "Check that you signed in with the same account email used to save it. Details that were never saved are not restored after a refresh. Editing a draft does not update an existing order." },
        { title: "My document is not downloadable", text: "Open the order and check its payment and document status. An unpaid order or a document that has not been published is not available to download. Withdrawn versions are also unavailable." },
        { title: "A detail in my request is wrong", text: "For a draft, make the correction and save it again. For an order, review the confirmed snapshot and the changes information before starting another request.", link: { href: "/refunds", label: "Read about changes" } },
      ] },
      { heading: "Keep your booking information private", paragraphs: ["An order reference can help identify a saved request, but it is not a password. Do not post traveller details, date of birth, sign-in codes or private document links in public comments. Never send payment or identity documents to an unverified contact."], links: [{ href: "/privacy", label: "How booking information is handled" }, { href: "/faq", label: "Browse service and account answers" }] },
    ],
  },
  terms: {
    overview: { label: "Read before you request", title: "Understand the service you are choosing.", points: ["Temporary reservation documents only", "Travel purchases remain separate", "Provisional terms; payments unavailable"], action: { href: "/dummy-ticket", label: "Review the service scope" } },
    sections: [
      { heading: "A practical summary of the service boundaries", paragraphs: ["Use this summary alongside the provisional terms above. It describes the document-request workflow; it does not add a guarantee, a new cancellation right or an automatic correction service."], cards: [
        { title: "Your confirmed request", text: "Review names, intended routes, dates, hotel stays and delivery details before creating an order. The order retains the confirmed details; later draft edits do not silently replace them." },
        { title: "What remains your decision", text: "Check whether the document is suitable for the receiving authority and your submission timing. Arrange paid travel and accommodation separately before you travel." },
        { title: "What saving does not do", text: "Saving a draft or order does not confirm payment, arrange a reservation, guarantee availability or establish a right to board a flight or check into a hotel." },
      ] },
    ],
  },
  privacy: {
    overview: { label: "Your booking information", title: "Know what you share and why.", points: ["No passport number or scan requested", "Account access uses a verified email", "Private PDFs are accessed through your order"], action: { href: "#information-the-form-requests", label: "Review the information requested" } },
    sections: [
      { heading: "A simple guide to the information flow", paragraphs: ["The form, your account and your selected delivery channel serve different purposes. Choosing WhatsApp for document delivery does not replace the verified email needed to access your account."], layout: "steps", cards: [
        { title: "While you complete the form", text: "Unsaved entries stay in the form's memory. Refreshing or leaving without saving loses those entries. Avoid using shared devices for personal booking details." },
        { title: "After you verify and save", text: "Saved details belong to your account. Authorised staff can use order details to manage the requested reservation-document service." },
        { title: "When documents are available", text: "You sign in to access your own eligible PDFs. If a document is sent through your chosen external delivery channel, that provider also handles the message." },
      ] },
      { heading: "What you can do to protect your account", paragraphs: ["Keep access to your email account secure and sign out on shared devices. Signing out does not delete saved orders. Do not enter a passport number, a scan, a card number or an email sign-in code into optional booking instructions."], links: [{ href: "/contact", label: "Find current account help" }] },
    ],
  },
  refunds: {
    overview: { label: "Before changing a request", title: "Check the record and its status first.", points: ["Draft edits do not change orders", "Payment and document status are separate", "No refund deadline is promised here"], action: { href: "/account/orders", label: "Review your order details" } },
    sections: [
      { heading: "Which stage is your request at?", paragraphs: ["Start by checking whether you are editing a saved draft or reviewing an order. This avoids assuming that an editable form has changed a document request already recorded elsewhere."], cards: [
        { title: "Draft only", text: "Open the draft, correct the relevant fields and explicitly save your changes. Review the complete summary again before creating an order." },
        { title: "Order awaiting payment", text: "The order still contains its confirmed snapshot. It does not establish a collected payment, and editing the original draft does not replace the order." },
        { title: "An existing document", text: "Review the actual document and its order details together. Do not assume a new version, cancellation or refund has been arranged because a draft was edited." },
      ] },
      { heading: "Make the discrepancy clear before requesting a correction", paragraphs: ["Identify the field that differs from your intended request: a name, flight sector, date, hotel city or stay period. Compare it with the confirmed order rather than only a recently edited draft. Keep sign-in codes and identity documents private.", "Direct contact options are shown on the help page when available. This provisional page does not promise correction eligibility, a refund amount or a processing deadline."], links: [{ href: "/contact", label: "Check current booking help" }, { href: "/terms", label: "Review the provisional service terms" }] },
    ],
  },
  destinations: {
    overview: { label: "Start with the official source", title: "Useful guidance, country by country.", points: ["France and United Kingdom starting points", "Direct links to official guidance", "No universal reservation requirement"], action: { href: "#collection", label: "Explore destination notes" } },
    sections: [
      { heading: "How to use a destination page", paragraphs: ["A destination note is a starting point for research, not a substitute for your personal application checklist. Read the source for the relevant purpose and category before choosing a commercial document service."], layout: "steps", cards: [
        { title: "Identify your circumstances", text: "Know your destination, purpose, nationality, residence and intended stay. Do not assume a visitor checklist also covers transit, study or a different purpose." },
        { title: "Read the official instructions", text: "Open the government source linked in the destination note. Follow it to the instructions that apply to you and record the date you checked." },
        { title: "Decide which evidence is relevant", text: "If reservation evidence is appropriate, compare your planned route and stays with that instruction. A country appearing here is not an endorsement of our service." },
      ], links: [{ href: "/guides/check-your-document-requirements", label: "Use the detailed research checklist" }] },
    ],
  },
  guides: {
    overview: { label: "Practical reading", title: "Get the detail right before you book.", points: ["Understand reservations versus paid travel", "Find the correct official checklist", "Align flight and hotel dates"], action: { href: "#collection", label: "Choose a planning guide" } },
    sections: [
      { heading: "Put each guide to work", paragraphs: ["Finish with a checked decision rather than only a bookmarked article. You can read every guide without entering personal details or starting an order."], layout: "steps", cards: [
        { title: "Write down the question", text: "Are you deciding what the document covers, whether your application needs it, or whether your dates align? Choose the guide that answers that specific question." },
        { title: "Keep the source with your notes", text: "For application evidence, record the original official instruction and date checked. For service costs, use the current pricing page rather than an old screenshot.", link: { href: "/pricing", label: "Check current service fees" } },
        { title: "Review the complete request", text: "Compare the guide's checklist with your own planned route, traveller names and hotel stays. Resolve an unclear requirement before entering a booking.", link: { href: "/dummy-ticket", label: "Review the service choices" } },
      ] },
    ],
  },
  france: {
    overview: { label: "France planning notes", title: "Check the purpose before the paperwork.", points: ["Start with France-Visas", "Use your application-specific checklist", "Review flight and hotel dates together"], action: { href: "#sources", label: "Open the official source" } },
    sections: [
      { heading: "Turn your plans into a consistent document request", paragraphs: ["Keep the official checklist and your intended itinerary side by side. These are planning checks for this service, not a statement that a reservation is required for every France application."], cards: [
        { title: "Flight dates", text: "List the intended entry and onward journeys. If an overnight flight is involved, confirm the arrival calendar date before choosing your first hotel stay." },
        { title: "Hotel stays", text: "Record each city and stay period separately. For example, a planned Paris stay followed by Lyon needs a review of the transition day, not only the first check-in." },
        { title: "Traveller consistency", text: "Use the same intended travellers and consistent spelling across the flight and hotel request. A property preference is still a request, not a confirmation." },
      ], links: [{ href: "/guides/flight-hotel-date-checklist", label: "Check a combined itinerary" }] },
    ],
  },
  "united-kingdom": {
    overview: { label: "UK planning notes", title: "Check relevance before choosing a service.", points: ["Visitor and transit guidance differ", "Do not assume a booking is required", "Use the official evidence instructions"], action: { href: "#sources", label: "Read the GOV.UK source" } },
    sections: [
      { heading: "A decision checklist before placing a request", paragraphs: ["Do not buy a document simply because it is sold for a destination. First identify what the authority handling your particular application asks you to demonstrate."], items: ["Confirm whether your purpose concerns a visit, transit or another category.", "Read the relevant official evidence instructions in full, including documents they advise against using.", "Keep the exact instruction and source link with your own planning notes.", "Only compare a reservation service if it is relevant to a separately verified requirement; otherwise there may be no reason to order."], links: [{ href: "/guides/check-your-document-requirements", label: "How to verify a document requirement" }] },
    ],
  },
  "temporary-reservation-vs-paid-ticket": {
    overview: { label: "Know the difference", title: "A document service is a separate purchase.", points: ["Reservation is not permission to board", "Hotel fees do not pay room rent", "Read actual reservation conditions"], action: { href: "/dummy-ticket", label: "Review what each service covers" } },
    sections: [
      { heading: "Three things that are easy to confuse", paragraphs: ["An order reference on this website, a temporary reservation document and a purchased travel service serve different purposes. Check which one you are looking at before relying on it."], cards: [
        { title: "Website order", text: "Records your confirmed request and service fee. An unpaid order is not proof of a reservation or a payment receipt." },
        { title: "Temporary reservation document", text: "Records the actual temporary reservation under its conditions. Review its details and suitability; do not infer paid travel from its appearance." },
        { title: "Paid travel or accommodation", text: "The separate airline-ticket or hotel purchase needed for your actual journey. Our reservation-document service fee does not pay these costs." },
      ] },
      { heading: "Questions to answer before relying on any document", paragraphs: ["Read the actual document rather than treating a logo, professional layout or reference number as a guarantee. If you cannot answer the questions below, review the request and official instructions again."], items: ["Does it identify the intended travellers, route or stay correctly?", "What does it actually confirm, and what conditions does it state?", "Does it suit the specific evidence instruction and submission timing?", "Have you separately arranged the paid travel you need for the journey itself?"], links: [{ href: "/sample-dummy-ticket", label: "Practice reviewing the illustrative layouts" }] },
    ],
  },
  "check-your-document-requirements": {
    overview: { label: "A repeatable research method", title: "Find the instruction before the document.", points: ["Identify the correct authority and category", "Keep the source and date checked", "Recheck before you submit"], action: { href: "/destinations", label: "Find official starting points" } },
    sections: [
      { heading: "Build a small requirement worksheet", paragraphs: ["Keep this worksheet in your own private notes. It helps separate an official instruction from a recommendation on a commercial website; it is not an additional form you need to submit to us."], cards: [
        { title: "Context", text: "Write the destination, purpose, application category and relevant personal circumstances. Avoid reusing a friend's checklist without checking whether it applies to you." },
        { title: "Source", text: "Save the official page title, link, date checked and the instruction you are relying on. Follow linked category-specific guidance rather than stopping at a search result." },
        { title: "Decision", text: "Record the evidence requested and whether you already have it. If the instruction is unclear, use the authority's official enquiry route rather than assuming a commercial reservation will be accepted." },
      ] },
      { heading: "Resolve conflicting advice before ordering", paragraphs: ["A service page can explain its own document product, but it does not set immigration evidence rules. If a blog, agent or booking website conflicts with an official instruction, return to the official source for the applicable category.", "A recent review date helps you assess a guide, but it does not make a commercial summary your personal checklist. Reopen the original source near submission and check for changes."], links: [{ href: "/destinations/france", label: "France official-source notes" }, { href: "/destinations/united-kingdom", label: "UK official-source notes" }] },
    ],
  },
  "flight-hotel-date-checklist": {
    overview: { label: "Before you save", title: "One itinerary, checked from end to end.", points: ["Names match across every document", "Hotel dates follow intended arrivals", "Each separate stay is reviewed"], action: { href: "/book?service=combo", label: "Prepare a flight + hotel request" } },
    sections: [
      { heading: "Work through an overnight-arrival example", paragraphs: ["Imagine an intended flight departs on 10 December and arrives on 11 December. These are example planning dates, not a live schedule. The departure date alone is not enough to choose hotel check-in."], layout: "steps", cards: [
        { title: "Confirm the intended arrival day", text: "Check the actual journey you intend to take. Do not copy 10 December into the hotel form simply because it is the flight departure date." },
        { title: "Review the first stay", text: "Choose the intended hotel dates deliberately. Arriving early on 11 December does not itself guarantee early check-in or access to a room." },
        { title: "Follow each onward movement", text: "If you move to another city, compare the first check-out, onward journey and next check-in together. Check for both unintended gaps and overlapping stays." },
      ] },
      { heading: "Use a final cross-check before creating an order", paragraphs: ["Review the full summary after any edit. A correct total does not mean every name, city and date is correct."], items: ["Count travellers and confirm that the same group is intended for every hotel stay.", "Read each flight sector in sequence, including the return or onward journey.", "Count distinct stays rather than hotel nights; check room count against the travellers in your request.", "Read the selected service, total, delivery channel and verified account email.", "Save the reviewed draft before leaving. An existing order retains the details confirmed when it was created."], links: [{ href: "/pricing", label: "Check the group and extra-stay fee" }] },
    ],
  },
};

export function withContentDepth<T extends PublicContent>(content: T): T {
  const addition = depth[content.slug];
  if (!addition) return content;
  const sections = addition.leadWithDetails ? [...addition.sections, ...content.sections] : [...content.sections, ...addition.sections];
  const presentation = content.slug === "dummy-ticket" ? "services" : content.slug === "contact" ? "support" : ["terms", "privacy", "refunds"].includes(content.slug) ? "policy" : content.slug === "faq" ? "questions" : content.slug === "how-it-works" ? "process" : content.presentation;
  return { ...content, reviewed: "2026-11-05", overview: addition.overview, sections, presentation };
}
