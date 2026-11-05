import Link from "next/link";
import { SampleDocument } from "@/components/sample-document";
import { PlanningLibrary, ReservationExplainer } from "@/components/public/home-planning";
import { publicMetadata } from "@/lib/seo";

export async function generateMetadata() { const { preferences } = await publicSite(); return publicMetadata("/", preferences.homeMetaTitle, preferences.homeMetaDescription); }
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCheck,
  ChevronDown,
  Clock3,
  CreditCard,
  Download,
  FileText,
  Globe2,
  Hotel,
  History,
  Info,
  ListChecks,
  Mail,
  MessageCircle,
  MoveUpRight,
  Plane,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import {
  business as defaultBusiness,
  formatPrice,
  getReservationQuote as baseQuote,
  serviceLabels,
  tripTypes,
} from "@/config/business";
import { publicSite, publishedEntries } from "@/lib/site-content";
import { pricingCatalog, preferenceDelivery, preferenceHours } from "@/lib/site-runtime";
import { TripStarter } from "@/components/trip-starter";

const steps = [
  {
    icon: ListChecks,
    title: "Tell us your plans",
    text: "Choose a dummy flight ticket, dummy hotel booking or both. Enter travel dates and traveller details once, then choose your delivery channel.",
  },
  {
    icon: CreditCard,
    title: "Sign in & review",
    text: "Verify your email with a sign-in code, check every detail and save your request securely.",
  },
  {
    icon: UserRound,
    title: "Follow your order",
    text: "View your order status in your account. Document preparation begins only after verified payment and complete details.",
  },
  {
    icon: Mail,
    title: "Receive your document",
    text: "Our team uploads your dummy flight ticket or dummy hotel booking documents to your order and sends them through your preferred channel.",
  },
];
function homepageFaqs(deliveryTarget: string, workingHours: string) { return [
  {question:"Can I get a dummy hotel booking and dummy flight ticket together?",answer:"Yes. Choose Dummy Hotel Booking when you already have flights, or Dummy Flight + Hotel Combo to request both in one order. Enter traveller details once and add the hotel city, country, check-in/check-out dates and rooms. Hotel fees are per traveller per stay, not room rent. Our team must arrange a reservation before publishing its document; availability and visa acceptance are not guaranteed."},
  {
    question: "What is a dummy ticket?",
    answer:
      "A dummy ticket is a temporary reservation document showing a proposed flight itinerary. The service fee covers preparation of that document; it does not purchase a paid airline ticket and cannot be used to board a flight. Check the requirements of the organisation requesting it. Acceptance, visa approval and fixed validity are not guaranteed.",
  },
  {
    question: "What information will I need to provide?",
    answer:
      "Your departure and destination cities or airports, travel dates, trip type and passenger names as shown on their passports. You will also need a login email for OTP verification, plus the WhatsApp number or email you choose for delivery. Any further required details will be confirmed in the booking flow.",
  },
  {
    question: "How will I receive my dummy flight ticket or dummy hotel booking?",
    answer:
      "After verified payment and preparation, your published documents are available in your account. You can also choose WhatsApp or email delivery. A verified account email is required for either option.",
  },
  {
    question: "How long does delivery take?",
    answer: `Our delivery target is ${deliveryTarget} after verified payment and receipt of complete details. Working hours are ${workingHours}. Requests outside these hours will be handled during the next working period. This is a target, not a guaranteed deadline.`,
  },
  {
    question: "Can I request changes to my details?",
    answer:
      "You can edit a saved draft before creating an order. An existing order keeps the details you confirmed when creating it. Review the changes and refunds information before requesting a correction; changes to an existing order are not automatic.",
  },
  {
    question: "Where can I check my order?",
    answer:
      "Sign in with your email code to resume saved drafts, view order status and download available reservation documents. Online payments are currently unavailable; new orders remain awaiting payment and document preparation does not begin.",
  },
]; }

export default async function Home() {
  const snapshot = await publicSite();
  const business = { ...defaultBusiness, ...pricingCatalog(snapshot.pricing) };
  const deliveryTarget = preferenceDelivery(snapshot.preferences), workingHours = preferenceHours(snapshot.preferences);
  const getReservationQuote: typeof baseQuote = (type, count, service, stays) => baseQuote(type, count, service, stays, business);
  const managedFaq = snapshot.records.find(record => record.key === "page:faq" && record.active)?.payload;
  const faqs = managedFaq && "faqs" in managedFaq && managedFaq.faqs?.length ? managedFaq.faqs : homepageFaqs(deliveryTarget, workingHours);
  const collections = publishedEntries(snapshot);
  return (
    <>
      <div id="top" />
      <main id="main-content" tabIndex={-1}>
        <section className="hero-section" aria-labelledby="hero-heading">
          <div className="container">
            <div className="hero-grid">
              <div className="hero-copy">
                <p className="eyebrow">
                  <span className="small-line" /> Dummy reservations, clearly explained
                </p>
                <h1 id="hero-heading">
                  {snapshot.preferences.heroTitle}
                  <br className="desktop-break" /> <span>{snapshot.preferences.heroHighlight}</span>
                </h1>
                <p className="hero-description">
                  {snapshot.preferences.heroIntro}
                </p>
                <div className="hero-actions">
                  <Link href="/book" className="button button-primary">
                    Plan your dummy ticket <ArrowUpRight size={18} />
                  </Link>
                  <a href="#sample" className="text-link">
                    View a sample <ArrowRight size={17} />
                  </a>
                </div>
                <p className="hero-caption">
                  <ShieldCheck size={17} /> Prepared by our team. Delivered with
                  care.
                </p>
              </div>
              <div className="hero-visual">
                <div className="visual-caption">
                  <span className="caption-line" /> A little paperwork. A big
                  next step.
                </div>
                <div className="ticket-stage">
                  <div className="paper-back" />
                  <SampleDocument compact />
                </div>
                <div className="delivery-tag">
                  <span className="delivery-tag-icon">
                    <CheckCheck size={21} />
                  </span>
                  <div>
                    <strong>Your plans. In one document.</strong>
                    <span>WhatsApp or email delivery</span>
                  </div>
                </div>
                <div className="visual-footnote">
                  <Globe2 size={14} /> An illustrative look at your itinerary
                </div>
              </div>
            </div>
            <div className="reservation-services" aria-label="Dummy ticket and hotel booking services">
              <Link href="/book?service=flight"><span className="service-card-top"><Plane size={24} aria-hidden="true" /><span>For your itinerary</span></span><strong>{serviceLabels.flight}</strong><span>One-way, return or multi-city. Request the flight document for your intended route.</span><ul><li>Planned flight sectors and dates</li><li>One set of traveller details</li></ul><b>From {formatPrice(business.prices["one-way"])} <span>/ traveller</span></b><span className="service-card-action">Prepare a flight request <ArrowUpRight size={18} aria-hidden="true" /></span></Link>
              <Link href="/book?service=hotel"><span className="service-card-top"><Hotel size={24} aria-hidden="true" /><span>For your stay</span></span><strong>{serviceLabels.hotel}</strong><span>Already have suitable flight evidence? Choose a hotel-only reservation request.</span><ul><li>City, check-in and check-out dates</li><li>Separate entries for each stay</li></ul><b>{formatPrice(business.hotelPriceMinor)} <span>/ traveller / stay</span></b><span className="service-card-action">Prepare a hotel request <ArrowUpRight size={18} aria-hidden="true" /></span></Link>
              <Link href="/book?service=combo" className="reservation-combo"><span className="service-card-top"><CheckCheck size={24} aria-hidden="true" /><span>Flight + one stay</span></span><strong>{serviceLabels.combo}</strong><span>Both reservation services in one order. Enter your travellers and contact details once.</span><ul><li>Review flights and stays together</li><li>Save {formatPrice(business.comboDiscountMinor)} per traveller</li></ul><b>From {formatPrice(getReservationQuote("one-way",1,"combo",1).totalMinor)} <span>/ traveller</span></b><span className="service-card-action">Prepare a combo request <ArrowUpRight size={18} aria-hidden="true" /></span></Link>
            </div>
            <TripStarter />
            <div className="hero-facts">
              <span>
                <Clock3 size={17} /> {deliveryTarget} delivery target*
              </span>
              <span>
                <MessageCircle size={17} /> WhatsApp or email
              </span>
              <span>
                <UserRound size={17} /> Manually prepared by our team
              </span>
            </div>
            <p className="delivery-condition">
              *After verified payment and complete details, during working
              hours. {workingHours}.
            </p>
          </div>
        </section>

        <section
          className="section section-pricing container"
          id="pricing"
          aria-labelledby="pricing-heading"
        >
          <div className="section-heading split-heading">
            <div>
              <p className="eyebrow">Simple, upfront pricing</p>
              <h2 id="pricing-heading">
                Different journeys.
                <br />
                One clear service fee.
              </h2>
            </div>
            <p>
              Choose the itinerary that fits your plans.
              <br />
              Every price is per passenger, in {business.currency}.
            </p>
          </div>
          <div className="pricing-grid">
            {tripTypes.map((trip, index) => (
              <article
                key={trip.value}
                className={`price-option ${index === 1 ? "price-featured" : ""}`}
              >
                <div className="price-top">
                  <span className="price-icon">
                    {index === 0 ? (
                      <MoveUpRight size={22} />
                    ) : index === 1 ? (
                      <ArrowRight size={22} />
                    ) : (
                      <Globe2 size={22} />
                    )}
                  </span>
                  {index === 1 && (
                    <span className="subtle-tag">Both directions included</span>
                  )}
                </div>
                <h3>{trip.label}</h3>
                <p>{trip.description}</p>
                <div className="price-amount">
                  {formatPrice(business.prices[trip.value])}
                  <span>/ passenger</span>
                </div>
                <div className="price-divider" />
                <p className="price-inclusion">
                  <Check size={17} />{" "}
                  {trip.value === "multi-city"
                    ? `Up to ${business.maxSectors} flight sectors`
                    : trip.value === "return"
                      ? "Outbound + return itinerary"
                      : "Single-sector itinerary"}
                </p>
                <p className="price-inclusion">
                  <Check size={17} /> WhatsApp or email delivery
                </p>
                <Link className="price-link" href={`/book?type=${trip.value}`}>
                  Plan your {trip.label.toLowerCase()} trip{" "}
                  <ArrowUpRight size={18} />
                </Link>
              </article>
            ))}
          </div>
          <p className="service-note">
            <Info size={17} />
            <span>
              You’re paying for a temporary reservation document. The service
              fee does not purchase a paid airline ticket.
            </span>
          </p>
          <div className="hotel-pricing-note"><h3>Need a dummy hotel booking too?</h3><p>Dummy Hotel Booking: {formatPrice(business.hotelPriceMinor)} per traveller per stay. Dummy Flight + Hotel Combo with one stay: {formatPrice(getReservationQuote("one-way",1,"combo",1).totalMinor)} per traveller, or {formatPrice(getReservationQuote("multi-city",1,"combo",1).totalMinor)} with multi-city flights. Each extra stay adds {formatPrice(business.hotelPriceMinor)} per traveller. The fee covers reservation services, not paid flights or accommodation.</p><div className="hero-actions"><Link className="button button-secondary" href="/book?service=hotel">Get dummy hotel booking</Link><Link className="button button-primary" href="/book?service=combo">Get dummy flight + hotel combo</Link></div></div>
        </section>

        <ReservationExplainer />

        <section
          className="how-section section"
          id="how-it-works"
          aria-labelledby="how-heading"
        >
          <div className="container">
            <div className="section-heading centered">
              <p className="eyebrow">From your plans to your inbox</p>
              <h2 id="how-heading">
                A few simple steps. We’ll take it from there.
              </h2>
              <p>Prepare and save now. Document preparation follows verified payment; online payments are currently unavailable.</p>
            </div>
            <div className="steps-grid">
              {steps.map((step, index) => (
                <article className="step" key={step.title}>
                  <div className="step-top">
                    <span className="step-icon">
                      <step.icon size={23} strokeWidth={1.6} />
                    </span>
                    <span className="step-number">0{index + 1}</span>
                  </div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </article>
              ))}
            </div>
            <div className="login-note">
              <ShieldCheck size={18} />
              <p>
                Your login email keeps your order accessible, even if you choose
                WhatsApp for delivery.
              </p>
            </div>
          </div>
        </section>

        <section
          className="section container receive-grid"
          id="what-you-receive"
          aria-labelledby="receive-heading"
        >
          <div>
            <p className="eyebrow">Thoughtfully prepared</p>
            <h2 id="receive-heading">
              Your itinerary.
              <br />
              The details that matter.
            </h2>
            <p className="section-description">
              A clear temporary reservation document, prepared manually using
              the trip and passenger details you provide.
            </p>
            <a href="#sample" className="text-link">
              Take a closer look <ArrowDown size={17} />
            </a>
          </div>
          <div className="receive-list">
            {[
              {
                icon: UserRound,
                title: "Passenger & journey details",
                text: "Passenger names, your route and intended travel dates in one document.",
              },
              {
                icon: FileText,
                title: "A temporary reservation",
                text: "For documenting proposed travel. Validity varies; check your application’s requirements.",
              },
              {
                icon: MessageCircle,
                title: "Delivery your way",
                text: "Our team will upload your document to your order and send it via WhatsApp or email.",
              },
            ].map((item) => (
              <div className="receive-item" key={item.title}>
                <span className="feature-icon">
                  <item.icon size={22} strokeWidth={1.6} />
                </span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section
          className="sample-section"
          id="sample"
          aria-labelledby="sample-heading"
        >
          <div className="container sample-grid">
            <div className="sample-display">
              <SampleDocument />
            </div>
            <div className="sample-copy">
              <p className="eyebrow">A clearer picture</p>
              <h2 id="sample-heading">
                Know what
                <br />
                you’re requesting.
              </h2>
              <p>
                This illustrative sample shows the kind of information a dummy
                ticket may contain. The actual layout and reservation details
                may differ.
              </p>
              <ul className="simple-checks">
                <li>
                  <Check size={18} /> Passenger and itinerary information
                </li>
                <li>
                  <Check size={18} /> Clear route and travel dates
                </li>
                <li>
                  <Check size={18} /> A document prepared for your order
                </li>
              </ul>
              <div className="sample-caution">
                <Info size={19} />
                <p>
                  This sample is not a valid reservation. No genuine PNR is
                  shown. A dummy ticket does not guarantee visa approval or
                  acceptance.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section
          className="section container account-grid"
          id="your-account"
          aria-labelledby="account-heading"
        >
          <div className="account-copy">
            <p className="eyebrow">Less guesswork, more clarity</p>
            <h2 id="account-heading">
              One place for
              <br />
              your next steps.
            </h2>
            <p className="section-description">
              Your account brings your orders and documents together, so you
              can see what happens next.
            </p>
            <div className="account-features">
              <span>
                <History size={18} /> Order history
              </span>
              <span>
                <CreditCard size={18} /> Payment status
              </span>
              <span>
                <Clock3 size={18} /> Fulfilment updates
              </span>
              <span>
                <Download size={18} /> Secure downloads
              </span>
            </div>
            <Link href="/account/orders" className="text-link" prefetch={false}>
              Explore your account <ArrowUpRight size={18} />
            </Link>
            <p className="small-note">
              Resume saved details, check order progress and access available documents.
            </p>
          </div>
          <div className="account-preview">
            <div className="account-preview-header">
              <span className="account-avatar">
                <UserRound size={20} />
              </span>
              <strong>My orders</strong>
              <span className="preview-label">Account features</span>
            </div>
            <div className="account-order">
              <div className="order-title">
                <span>Your travel paperwork</span>
                <span>Flight · Hotel · Combo</span>
              </div>
              <div className="account-route">
                <strong>Plan</strong>
                <ArrowRight size={20} />
                <strong>Review</strong>
              </div>
              <div className="account-feature-grid">
                <div>
                  <span>Save</span>
                  <strong>Your details</strong>
                </div>
                <div>
                  <span>Track</span>
                  <strong>Order progress</strong>
                </div>
                <div>
                  <span>Download</span>
                  <strong>Available PDFs</strong>
                </div>
              </div>
              <div className="document-pending">
                <FileText size={20} />
                <div>
                  <strong>Documents, together in your account</strong>
                  <span>Available after payment and document preparation</span>
                </div>
                <Download size={17} />
              </div>
            </div>
            <div className="account-preview-bottom">
              <ShieldCheck size={15} /> Private access with your verified email
            </div>
          </div>
        </section>

        <section
          className="faq-section section"
          id="faq"
          aria-labelledby="faq-heading"
        >
          <div className="container faq-grid">
            <div>
              <p className="eyebrow">A little clarity</p>
              <h2 id="faq-heading">
                Good questions.
                <br />
                Straight answers.
              </h2>
              <p className="section-description">
                A few things to know before
                <br className="desktop-break" /> you plan your dummy ticket.
              </p>
              <Link href="/contact" className="text-link">
                Booking help <ArrowUpRight size={17} />
              </Link>
            </div>
            <div className="faq-list">
              {faqs.map((faq, index) => (
                <details
                  className="faq-item"
                  key={faq.question}
                  name="homepage-faq"
                  open={index === 0}
                >
                  <summary>
                    {faq.question}
                    <ChevronDown size={19} />
                  </summary>
                  <p>{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <PlanningLibrary items={collections.guides} notes={collections.destinations} />
        <section className="container closing-section">
          <div>
            <p className="eyebrow">
              <Sparkles size={15} /> Ready for your next chapter?
            </p>
            <h2>
              Start with a plan.
              <br />
              We’ll help with the paperwork.
            </h2>
            <p>Flight, hotel or both. A clear request starts with the right details.</p>
          </div>
          <div className="closing-action">
            <Link href="/book" className="button button-primary">
              Book dummy ticket <ArrowUpRight size={19} />
            </Link>
            <span>Flight, hotel or both · Review before saving</span>
          </div>
        </section>
      </main>
    </>
  );
}
